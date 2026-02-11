import { useState, useEffect } from 'react';
import { Track } from '../types';
import { supabase } from '../lib/supabase';
import { FastAverageColor } from 'fast-average-color';
import { searchExternalMetadata, TrackMetadataResult } from '../services/metadata';

export const useTrackMetadata = (track: Track) => {
  const [metadata, setMetadata] = useState<TrackMetadataResult>({ 
    artworkUrl: track.artwork_url || undefined,
    previewUrl: track.preview_url || undefined,
    genre: track.genre || undefined,
    found: !!track.artwork_url 
  });
  
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dominantColor, setDominantColor] = useState<string | null>(null);

  // Initial Metadata Fetch & Sync
  useEffect(() => {
    let isMounted = true;

    const initMetadata = async () => {
      // 1. Always sync local state with the incoming track prop first.
      // This is crucial because the component might be reused (recycled) by React,
      // retaining the previous track's state if we don't overwrite it.
      
      const hasCompleteData = !!(track.artwork_url && track.genre);
      
      setMetadata({
        artworkUrl: track.artwork_url || undefined,
        previewUrl: track.preview_url || undefined,
        genre: track.genre || undefined,
        found: !!track.artwork_url
      });
      
      // If we already have the data in the DB/Prop, we are done.
      if (hasCompleteData) {
          setIsLoadingMetadata(false);
          return;
      }

      setIsLoadingMetadata(true);
      
      // Artificial delay for staggering visual pop-in (optional aesthetic choice)
      // Only do this if we are actually going to fetch new data
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      if (!isMounted) return;

      // Perform search via service
      const foundData = await searchExternalMetadata(track);

      if (!isMounted) return;

      if (foundData) {
        // Only update if we found something
        const newArtworkUrl = track.artwork_url || foundData.artworkUrl;
        const newPreviewUrl = track.preview_url || foundData.previewUrl;
        const newGenre = track.genre || foundData.genre;

        setMetadata({
          artworkUrl: newArtworkUrl,
          previewUrl: newPreviewUrl,
          genre: newGenre,
          found: true
        });

        // Cache to DB
        const updates: any = {};
        if (!track.artwork_url && foundData.artworkUrl) updates.artwork_url = foundData.artworkUrl;
        if (!track.preview_url && foundData.previewUrl) updates.preview_url = foundData.previewUrl;
        if (!track.genre && foundData.genre) updates.genre = foundData.genre;

        if (Object.keys(updates).length > 0) {
          supabase.from('tracks').update(updates).eq('id', track.id).then(({ error }) => {
              if (error) console.warn('Failed to cache metadata to DB:', error.message);
          });
        }
      }
      
      setIsLoadingMetadata(false);
    };

    initMetadata();

    return () => {
      isMounted = false;
    };
  }, [track]); // Reruns whenever the track object changes (e.g. week switch)

  // Dominant Color Extraction
  useEffect(() => {
    setDominantColor(null); // Reset color immediately on change
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
        // Silent fail
      });
    }
  }, [metadata.artworkUrl]);

  // Healing Logic
  const healMetadata = async (): Promise<string | undefined> => {
      setIsRetrying(true);
      console.log("Attempting to heal metadata for:", track.title);

      const freshData = await searchExternalMetadata(track);
      
      if (freshData && freshData.previewUrl) {
          const updates: any = {
              preview_url: freshData.previewUrl,
              artwork_url: freshData.artworkUrl || track.artwork_url
          };
          if (!track.genre && freshData.genre) updates.genre = freshData.genre;

          await supabase.from('tracks').update(updates).eq('id', track.id);
          
          setMetadata(prev => ({ ...prev, ...freshData, genre: track.genre || freshData.genre || prev.genre }));
          setIsRetrying(false);
          return freshData.previewUrl;
      } else {
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