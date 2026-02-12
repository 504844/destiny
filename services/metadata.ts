import { Track } from '../types';
import { supabase } from '../lib/supabase';

export interface TrackMetadataResult {
  artworkUrl?: string;
  previewUrl?: string;
  genre?: string;
  bpm?: number;
  energy?: number;
  country?: string;
  found: boolean;
}

// --- Helper Functions ---

export const getPrimaryArtist = (text: string) => {
  if (!text) return '';
  const separators = [',', ' ft.', ' feat.', ' x ', ' & ', ' vs ', ' vs. ', ' el al', ' et al'];
  let primary = text;
  
  for (const sep of separators) {
    const idx = primary.toLowerCase().indexOf(sep);
    if (idx !== -1) {
      primary = primary.substring(0, idx);
    }
  }
  
  return primary.replace(/\s(el|et)\s?al\.?$/i, '').trim();
};

export const cleanString = (text: string, keepParenthesesContent: boolean = false) => {
  if (!text) return '';
  let cleaned = text.toLowerCase();

  if (!keepParenthesesContent) {
    cleaned = cleaned.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');
  } else {
    cleaned = cleaned.replace(/[\[\]()]/g, ' ');
  }

  return cleaned
    .replace(/et\.al\.?/gi, ' ')
    .replace(/el\.al\.?/gi, ' ')
    .replace(/feat\.?/gi, ' ')
    .replace(/ft\.?/gi, ' ')
    .replace(/[,&]/g, ' ')
    .replace(/[\/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// --- API Fetchers ---

const fetchMetadataFromEdgeFunction = async (query: string) => {
  try {
    console.log(`[Edge Function] Requesting metadata for: "${query}"`);
    const { data, error } = await supabase.functions.invoke('scan-metadata', {
      body: { query }
    });

    if (error) {
      console.warn('[Edge Function] Invocation failed:', error);
      return null;
    }

    if (data && data.found) {
      console.log('[Edge Function] Match found:', data.title);
      return {
        artworkUrl: data.artworkUrl,
        previewUrl: data.previewUrl,
        bpm: data.bpm,
        energy: data.energy,
        country: data.country,
        genre: null // Edge function (Spotify) doesn't reliably give genre per track
      };
    } else {
      console.log('[Edge Function] No match found.');
    }
  } catch (err) {
    console.error('[Edge Function] System Error:', err);
  }
  return null;
};

const fetchDeezerMetadata = (query: string): Promise<any> => {
  return new Promise((resolve) => {
    const callbackName = `deezer_${Math.random().toString(36).substring(7)}`;
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    const cleanup = () => {
      if ((window as any)[callbackName]) delete (window as any)[callbackName];
      if (document.body.contains(script)) document.body.removeChild(script);
      clearTimeout(timeout);
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.src = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=jsonp&callback=${callbackName}&limit=1`;
    script.onerror = () => {
      cleanup();
      resolve(null);
    };
    
    document.body.appendChild(script);
  });
};

const fetchItunesMetadata = async (query: string) => {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`);
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log(`[iTunes] Found: ${result.artistName} - ${result.trackName} | Genre: ${result.primaryGenreName}`);
        return {
          artworkUrl: result.artworkUrl100 || result.artworkUrl60,
          previewUrl: result.previewUrl,
          genre: result.primaryGenreName
        };
      }
    }
  } catch (error) {
    console.warn('iTunes fetch failed for query:', query, error);
  }
  return null;
};

// Standalone search function that can be called by useEffect OR by retry logic
export const searchExternalMetadata = async (track: Track): Promise<TrackMetadataResult | null> => {
  const primaryArtist = getPrimaryArtist(track.artists);
  const cleanPrimaryArtist = cleanString(primaryArtist);

  // Query A: "Specific" - Keep mix names
  const titleWithMix = cleanString(track.title, true);
  const querySpecific = `${titleWithMix} ${cleanPrimaryArtist}`;

  // Query B: "Broad" - Remove mix names
  const titleNoMix = cleanString(track.title, false);
  const queryBroad = `${titleNoMix} ${cleanPrimaryArtist}`;

  let foundData: { artworkUrl?: string; previewUrl?: string; genre?: string; bpm?: number; energy?: number; country?: string } | null = null;

  // --- 1. Edge Function (Spotify - Best for BPM/Energy/Artwork) ---
  // This replaces the old client-side Spotify logic that caused CORS errors.
  foundData = await fetchMetadataFromEdgeFunction(querySpecific);
  if (!foundData && queryBroad !== querySpecific) {
    foundData = await fetchMetadataFromEdgeFunction(queryBroad);
  }

  // --- 2. iTunes (Best for Genres & Previews if Spotify fails) ---
  let itunesData = await fetchItunesMetadata(querySpecific);
  if (!itunesData && queryBroad !== querySpecific) {
    itunesData = await fetchItunesMetadata(queryBroad);
  }

  // Merge iTunes genre/preview into foundData if available
  if (itunesData) {
    if (!foundData) {
        foundData = itunesData;
    } else {
        if (!foundData.genre) foundData.genre = itunesData.genre;
        if (!foundData.previewUrl) foundData.previewUrl = itunesData.previewUrl;
    }
  }

  // --- 3. Deezer (Last Resort) ---
  if (!foundData) {
    const deezerData = await fetchDeezerMetadata(querySpecific);
    if (deezerData?.data?.[0]) {
       foundData = { artworkUrl: deezerData.data[0].album?.cover_medium, previewUrl: deezerData.data[0].preview };
    }
  }

  if (foundData) {
      return {
          artworkUrl: foundData.artworkUrl,
          previewUrl: foundData.previewUrl,
          genre: foundData.genre,
          bpm: foundData.bpm,
          energy: foundData.energy,
          country: foundData.country,
          found: true
      };
  }

  return null;
};

export const getSearchUrl = (track: Track, platform: 'spotify' | 'youtube' | 'soundcloud' | 'apple') => {
    const cleanTitle = cleanString(track.title, true);
    const primaryArtist = getPrimaryArtist(track.artists);
    const query = encodeURIComponent(`${cleanTitle} ${primaryArtist}`);
    
    switch (platform) {
      case 'spotify': return `https://open.spotify.com/search/${query}`;
      case 'youtube': return `https://www.youtube.com/results?search_query=${query}`;
      case 'soundcloud': return `https://soundcloud.com/search?q=${query}`;
      case 'apple': return `https://music.apple.com/us/search?term=${query}`;
      default: return '#';
    }
};