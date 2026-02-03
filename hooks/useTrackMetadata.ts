import { useState, useEffect } from 'react';
import { Track } from '../types';
import { supabase } from '../lib/supabase';
import { FastAverageColor } from 'fast-average-color';
import { searchExternalMetadata, TrackMetadataResult } from '../services/metadata';

export const useTrackMetadata = (track: Track) => {
  const [metadata, setMetadata] = useState<TrackMetadataResult>({ 
    artworkUrl: track.artwork_url || undefined,
    previewUrl: track.preview_url || undefined,
    found: !!track.artwork_url 
  });
  
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dominantColor, setDominantColor] = useState<string | null>(null);

  // Initial Metadata Fetch
  useEffect(() => {
    let isMounted = true;

    const initMetadata = async () => {
      setIsLoadingMetadata(true);

      // Use DB data if available
      if (track.artwork_url && track.preview_url) {
        setMetadata({
          artworkUrl: track.artwork_url,
          previewUrl: track.preview_url,
          found: true
        });
        setIsLoadingMetadata(false);
        return;
      }
      
      // Artificial delay for staggering visual pop-in
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      if (!isMounted) return;

      // Perform search via service
      const foundData = await searchExternalMetadata(track);

      if (!isMounted) return;

      if (foundData) {
        const newArtworkUrl = track.artwork_url || foundData.artworkUrl;
        const newPreviewUrl = track.preview_url || foundData.previewUrl;

        setMetadata({
          artworkUrl: newArtworkUrl,
          previewUrl: newPreviewUrl,
          found: true
        });

        // Cache to DB
        const updates: any = {};
        if (!track.artwork_url && foundData.artworkUrl) updates.artwork_url = foundData.artworkUrl;
        if (!track.preview_url && foundData.previewUrl) updates.preview_url = foundData.previewUrl;

        if (Object.keys(updates).length > 0) {
          supabase.from('tracks').update(updates).eq('id', track.id).then(({ error }) => {
              if (error) console.warn('Failed to cache metadata to DB:', error.message);
          });
        }
      } else {
        setMetadata(prev => ({ ...prev, found: !!prev.artworkUrl }));
      }
      
      setIsLoadingMetadata(false);
    };

    initMetadata();

    return () => {
      isMounted = false;
    };
  }, [track]); 

  // Dominant Color Extraction
  useEffect(() => {
    if (metadata.artworkUrl) {
      const fac = new FastAverageColor();
      fac.getColorAsync(metadata.artworkUrl, { 
        algorithm: 'dominant', 
        crossOrigin: 'anonymous' 
      })
      .then(color => {
        setDominantColor(color.hex);
      })
      .catch(e => {
        console.debug("Could not extract color", e);
      });
    }
  }, [metadata.artworkUrl]);

  // Healing Logic - Exposed function to be called on audio error
  const healMetadata = async (): Promise<string | undefined> => {
      setIsRetrying(true);
      console.log("Attempting to heal metadata for:", track.title);

      const freshData = await searchExternalMetadata(track);
      
      if (freshData && freshData.previewUrl) {
          console.log("Healed! New URL found.");
          
          // Update DB
          await supabase.from('tracks').update({ 
              preview_url: freshData.previewUrl,
              artwork_url: freshData.artworkUrl || track.artwork_url
          }).eq('id', track.id);
          
          setMetadata(prev => ({ ...prev, ...freshData }));
          setIsRetrying(false);
          return freshData.previewUrl;
      } else {
          console.warn("Healing failed.");
          
          // Mark as failed in DB to prevent infinite loops in future sessions
          await supabase.from('tracks').update({ preview_url: null }).eq('id', track.id);
          
          setMetadata(prev => ({ ...prev, previewUrl: undefined }));
          setIsRetrying(false);
          return undefined;
      }
  };

  return {
    metadata,
    isLoadingMetadata,
    isRetrying,
    dominantColor,
    healMetadata
  };
};