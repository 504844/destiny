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
    bpm: track.bpm || undefined,
    energy: track.energy || undefined,
    country: track.country || undefined,
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
      const hasCompleteData = !!(track.artwork_url && track.genre && track.bpm);
      
      setMetadata({
        artworkUrl: track.artwork_url || undefined,
        previewUrl: track.preview_url || undefined,
        genre: track.genre || undefined,
        bpm: track.bpm || undefined,
        energy: track.energy || undefined,
        country: track.country || undefined,
        found: !!track.artwork_url
      });
      
      // If we already have the data in the DB/Prop, we are done.
      if (hasCompleteData) {
          setIsLoadingMetadata(false);
          return;
      }

      setIsLoadingMetadata(true);
      
      // Artificial delay for staggering visual pop-in (optional aesthetic choice)
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
        const newBpm = track.bpm || foundData.bpm;
        const newEnergy = track.energy || foundData.energy;
        const newCountry = track.country || foundData.country;

        setMetadata({
          artworkUrl: newArtworkUrl,
          previewUrl: newPreviewUrl,
          genre: newGenre,
          bpm: newBpm,
          energy: newEnergy,
          country: newCountry,
          found: true
        });

        // Cache to DB
        const updates: any = {};
        if (!track.artwork_url && foundData.artworkUrl) updates.artwork_url = foundData.artworkUrl;
        if (!track.preview_url && foundData.previewUrl) updates.preview_url = foundData.previewUrl;
        if (!track.genre && foundData.genre) updates.genre = foundData.genre;
        if (!track.bpm && foundData.bpm) updates.bpm = foundData.bpm;
        if (!track.energy && foundData.energy) updates.energy = foundData.energy;
        if (!track.country && foundData.country) updates.country = foundData.country;

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
  }, [track]); // Reruns whenever the track object changes

  // Dominant Color Extraction
  useEffect(() => {
    setDominantColor(null);
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
          if (!track.bpm && freshData.bpm) updates.bpm = freshData.bpm;
          if (!track.energy && freshData.energy) updates.energy = freshData.energy;

          await supabase.from('tracks').update(updates).eq('id', track.id);
          
          setMetadata(prev => ({ 
             ...prev, 
             ...freshData, 
             genre: track.genre || freshData.genre || prev.genre,
             bpm: track.bpm || freshData.bpm || prev.bpm,
             energy: track.energy || freshData.energy || prev.energy
          }));
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