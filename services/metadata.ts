import { Track } from '../types';

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

// --- API Config ---
const SPOTIFY_CLIENT_ID = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_ID || '9427a52344624526b28494d0104951ff';
const SPOTIFY_CLIENT_SECRET = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_SECRET || 'f6b01f4984554edcb4f793feb6d52b9e';

// --- API Fetchers ---

const getSpotifyAccessToken = async () => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;

  // Check localStorage for cached token
  const cachedToken = localStorage.getItem('spotify_access_token');
  const tokenExpiry = localStorage.getItem('spotify_token_expiry');

  if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    return cachedToken;
  }

  try {
    // We use corsproxy.io to bypass CORS restrictions for the client-side token request
    // Note: In production with a backend, this should be done server-side.
    const response = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://accounts.spotify.com/api/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    });

    if (response.ok) {
      const data = await response.json();
      const token = data.access_token;
      const expiresIn = data.expires_in; // usually 3600 seconds
      
      localStorage.setItem('spotify_access_token', token);
      localStorage.setItem('spotify_token_expiry', (Date.now() + (expiresIn * 1000)).toString());
      
      return token;
    }
  } catch (error) {
    console.warn('Spotify Token Error (Client Side):', error);
  }
  return null;
};

const fetchSpotifyMetadata = async (query: string) => {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  try {
    // 1. Search for the track
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.tracks && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        
        // 2. Fetch Audio Features for the track
        let features: any = null;
        try {
            const featsRes = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (featsRes.ok) {
                features = await featsRes.json();
            }
        } catch (e) {
            console.warn('Spotify Audio Features Error', e);
        }

        return {
          artworkUrl: track.album?.images?.[0]?.url,
          previewUrl: track.preview_url, // Note: Spotify preview_url is sometimes null
          bpm: features?.tempo ? Math.round(features.tempo) : undefined,
          energy: features?.energy ? Math.round(features.energy * 100) : undefined
        };
      }
    }
  } catch (error) {
    console.warn('Spotify search failed:', error);
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
          genre: result.primaryGenreName // Extract Genre
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

  // Query C: "Fallback"
  const firstArtistToken = cleanPrimaryArtist.split(' ')[0] || '';
  const queryFallback = `${titleNoMix} ${firstArtistToken}`;

  let foundData: { artworkUrl?: string; previewUrl?: string; genre?: string; bpm?: number; energy?: number } | null = null;

  // --- 1. iTunes (Best for previews & GENRES) ---
  foundData = await fetchItunesMetadata(querySpecific);
  
  if (!foundData && queryBroad !== querySpecific) {
    foundData = await fetchItunesMetadata(queryBroad);
  }
  
  // --- 2. Spotify (Best for finding obscure tracks & BPM/Energy) ---
  // If we found basic data in iTunes, we might still want Spotify for BPM/Energy if missing?
  // For simplicity, we search in order. If iTunes found it, we use it. 
  // If you strictly want BPM/Energy, you might want to call Spotify regardless.
  // But to save API calls, we'll try Spotify if iTunes fails OR if we specifically want BPM (Magic Scan).
  
  if (!foundData) {
    foundData = await fetchSpotifyMetadata(querySpecific);
  }
  
  if (!foundData && queryBroad !== querySpecific) {
    foundData = await fetchSpotifyMetadata(queryBroad);
  }

  // --- 3. Deezer (Fallback) ---
  if (!foundData) {
    const deezerData = await fetchDeezerMetadata(querySpecific);
    if (deezerData?.data?.[0]) {
       foundData = { artworkUrl: deezerData.data[0].album?.cover_medium, previewUrl: deezerData.data[0].preview };
    }
  }

  if (!foundData && queryBroad !== querySpecific) {
    const deezerData = await fetchDeezerMetadata(queryBroad);
    if (deezerData?.data?.[0]) {
       foundData = { artworkUrl: deezerData.data[0].album?.cover_medium, previewUrl: deezerData.data[0].preview };
    }
  }

  // --- 4. Final Fallback (iTunes fuzzy) ---
  if (!foundData && firstArtistToken) {
     foundData = await fetchItunesMetadata(queryFallback);
  }

  if (foundData) {
      console.log(`[Metadata] Search success for "${track.title}":`, foundData);
      return {
          artworkUrl: foundData.artworkUrl,
          previewUrl: foundData.previewUrl,
          genre: foundData.genre,
          bpm: foundData.bpm,
          energy: foundData.energy,
          found: true
      };
  } else {
      console.log(`[Metadata] No results found for "${track.title}"`);
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