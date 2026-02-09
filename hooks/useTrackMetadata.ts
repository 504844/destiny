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

  // Initial Metadata Fetch
  useEffect(() => {
    let isMounted = true;

    const initMetadata = async () => {
      // CRITICAL: If we already have artwork AND genre loaded in local state, DO NOT fetch again.
      // We check for GENRE too, so we can backfill it if missing.
      if (metadata.artworkUrl && metadata.genre) {
          setIsLoadingMetadata(false);
          return;
      }

      setIsLoadingMetadata(true);

      // Use DB data from props if available (and state wasn't initialized with it)
      // Only short-circuit if we have BOTH artwork and genre.
      if (track.artwork_url && track.genre) {
        setMetadata(prev => ({
          ...prev,
          artworkUrl: track.artwork_url!,
          previewUrl: track.preview_url || prev.previewUrl,
          genre: track.genre!,
          found: true
        }));
        setIsLoadingMetadata(false);
        return;
      }
      
      console.log(`[Metadata] Fetching for "${track.title}" (Missing genre or artwork)`);
      
      // Artificial delay for staggering visual pop-in (only for initial fetch)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      if (!isMounted) return;

      // Perform search via service
      const foundData = await searchExternalMetadata(track);

      if (!isMounted) return;

      if (foundData) {
        // Only update if we found something
        // PREFER existing DB/Prop data for artwork to prevent changing it
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
        
        // ONLY update genre if it's currently missing in the DB
        if (!track.genre && foundData.genre) {
            console.log(`[DB] Saving missing genre for "${track.title}": ${foundData.genre}`);
            updates.genre = foundData.genre;
        }

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
  }, [track]); // Dependency on 'track' triggers update if parent passes new reference

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
          
          const updates: any = {
              preview_url: freshData.previewUrl,
              artwork_url: freshData.artworkUrl || track.artwork_url
          };

          // Also heal genre if we found one and we didn't have one before
          if (!track.genre && freshData.genre) {
              updates.genre = freshData.genre;
          }

          // Update DB
          await supabase.from('tracks').update(updates).eq('id', track.id);
          
          setMetadata(prev => ({ ...prev, ...freshData, genre: track.genre || freshData.genre || prev.genre }));
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