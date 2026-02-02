import React, { useEffect, useState, useRef } from 'react';
import { Track } from '../types';
import { cn, getMedalColor, getRowStyle } from '../lib/utils';
import { Trophy, Medal, User, Music2, Play, Pause, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FastAverageColor } from 'fast-average-color';
import { SpotifyLogo, AppleLogo, SoundcloudLogo, YoutubeLogo } from '@phosphor-icons/react';

interface TrackItemProps {
  track: Track;
  isActive: boolean;
  onPlay: () => void;
  onStop: () => void;
  onColorChange?: (color: string | null) => void;
  isHighlighted?: boolean;
}

interface TrackMetadata {
  artworkUrl?: string;
  previewUrl?: string;
  found: boolean;
}

// --- Spotify API Config ---
// Fix: Cast import.meta to any to resolve TS error: Property 'env' does not exist on type 'ImportMeta'.
const SPOTIFY_CLIENT_ID = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_ID || '9427a52344624526b28494d0104951ff';
const SPOTIFY_CLIENT_SECRET = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_SECRET || 'f6b01f4984554edcb4f793feb6d52b9e';

// --- Helper Functions ---

const getPrimaryArtist = (text: string) => {
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

const cleanString = (text: string, keepParenthesesContent: boolean = false) => {
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

const getSpotifyAccessToken = async () => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;

  // Check localStorage for cached token
  const cachedToken = localStorage.getItem('spotify_access_token');
  const tokenExpiry = localStorage.getItem('spotify_token_expiry');

  if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    return cachedToken;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
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
    console.error('Spotify Token Error:', error);
  }
  return null;
};

const fetchSpotifyMetadata = async (query: string) => {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.tracks && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        return {
          artworkUrl: track.album?.images?.[0]?.url,
          previewUrl: track.preview_url // Note: Spotify preview_url is sometimes null
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
        return {
          artworkUrl: result.artworkUrl100 || result.artworkUrl60,
          previewUrl: result.previewUrl
        };
      }
    }
  } catch (error) {
    console.warn('iTunes fetch failed for query:', query, error);
  }
  return null;
};

// Standalone search function that can be called by useEffect OR by retry logic
const searchExternalMetadata = async (track: Track) => {
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

  let foundData: { artworkUrl?: string; previewUrl?: string } | null = null;

  // --- 1. iTunes (Best for previews) ---
  foundData = await fetchItunesMetadata(querySpecific);
  
  if (!foundData && queryBroad !== querySpecific) {
    foundData = await fetchItunesMetadata(queryBroad);
  }
  
  // --- 2. Spotify (Best for finding obscure tracks) ---
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

  return foundData;
};

// --- Component ---

export const TrackItem: React.FC<TrackItemProps> = ({ track, isActive, onPlay, onStop, onColorChange, isHighlighted }) => {
  const [metadata, setMetadata] = useState<TrackMetadata>({ 
    artworkUrl: track.artwork_url || undefined,
    previewUrl: track.preview_url || undefined,
    found: !!track.artwork_url 
  });
  
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false); // State for auto-healing / loading
  const [progress, setProgress] = useState(0);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to view if highlighted
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Initial Metadata Fetch (checks DB first)
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

      // Perform search
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

  // Sync color with global background
  useEffect(() => {
    if (onColorChange) {
      if (isActive && dominantColor) {
        onColorChange(dominantColor);
      } else if (!isActive && dominantColor && audioRef.current?.paused === false) {
         // Should not happen if isActive works, but safe cleanup
      }
    }
  }, [isActive, dominantColor, onColorChange]);

  // Audio Playback & Lifecycle Management
  useEffect(() => {
    let isCancelled = false;
    const audio = audioRef.current;

    const playAudio = async () => {
      // If we don't have an audio instance or the url changed (handled by effect dependency on metadata), create it.
      if (!audioRef.current || audioRef.current.src !== metadata.previewUrl) {
          if (!metadata.previewUrl) return; 
          
          const newAudio = new Audio(metadata.previewUrl);
          newAudio.volume = 0.5;
          newAudio.onended = () => {
            if (!isCancelled) onStop();
          };
          newAudio.ontimeupdate = () => {
             if (!isCancelled && newAudio.duration) {
               setProgress((newAudio.currentTime / newAudio.duration) * 100);
             }
          };
          
          // Healing Logic
          newAudio.onerror = async (e) => {
            console.warn("Audio playback failed. Attempting heal...", e);
            if (isCancelled) return;
            
            setIsRetrying(true);
            
            // Try to find new metadata
            const freshData = await searchExternalMetadata(track);
            
            if (isCancelled) return;
            
            if (freshData && freshData.previewUrl) {
               console.log("Healed! New URL found.");
               
               // Update DB
               await supabase.from('tracks').update({ 
                 preview_url: freshData.previewUrl,
                 artwork_url: freshData.artworkUrl || track.artwork_url
               }).eq('id', track.id);
               
               // Trigger re-render with new URL, which will re-run this effect
               setMetadata(prev => ({ ...prev, ...freshData }));
               setIsRetrying(false); 
            } else {
               console.warn("Healing failed.");
               setIsRetrying(false);
               onStop();
               // Update DB to null to prevent future errors
               await supabase.from('tracks').update({ preview_url: null }).eq('id', track.id);
               setMetadata(prev => ({ ...prev, previewUrl: undefined }));
            }
          };

          audioRef.current = newAudio;
      }
      
      const currentAudio = audioRef.current;
      
      try {
        await currentAudio.play();
      } catch (err) {
        console.error("Play failed:", err);
        // Browser autoplay policy or other error
      }
    };

    if (isActive) {
      playAudio();
    } else {
      // Stop playback if we are no longer active
      if (audioRef.current) {
        audioRef.current.pause();
        // We don't nullify audioRef to keep it cached if user plays again, 
        // but if URL changes the IF block above handles recreation.
      }
      setIsRetrying(false);
      setProgress(0);
      if (onColorChange) onColorChange(null);
    }

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isActive, metadata.previewUrl]); // Re-run if active state changes or if URL changes (healing)


  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!metadata.previewUrl && !isRetrying) return;

    if (isActive) {
      onStop();
    } else {
      onPlay();
    }
  };

  const MedalIcon = () => {
    // Just show position number
    return <span className={cn("text-sm font-mono w-4 text-center", isActive ? "text-white" : "")}>{track.position}</span>;
  };

  const getSearchUrl = (platform: 'spotify' | 'youtube' | 'soundcloud' | 'apple') => {
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

  const expandedStyle = isActive && dominantColor ? {
    background: `linear-gradient(135deg, ${dominantColor}33 0%, #18181b 100%)`, 
    borderColor: `${dominantColor}66`, 
    boxShadow: `0 20px 40px -5px ${dominantColor}22` 
  } : undefined;

  return (
    <div 
      ref={itemRef}
      className={cn(
        "group relative flex items-center rounded-xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isActive 
          ? "flex-col sm:flex-row py-6 px-4 gap-4 sm:gap-6 my-6 bg-zinc-900 border border-zinc-700 shadow-2xl scale-100 sm:scale-[1.03] z-10 w-full max-w-full" 
          : cn("gap-3 sm:gap-4 px-3 py-2 sm:px-4 sm:py-3 border border-zinc-800/60 bg-zinc-900/40", getRowStyle(track.medal)),
        isHighlighted && !isActive && "ring-2 ring-white/50 bg-zinc-800/60 scale-[1.02] shadow-lg shadow-white/10"
      )}
      style={expandedStyle}
    >
      {/* Position / Medal */}
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center transition-all duration-500",
        isActive 
           // Expanded: Using top-3 left-3 to match collapsed px-3 padding
           ? "absolute top-3 left-3 sm:static w-8 h-8 sm:w-10 sm:h-10 sm:scale-110 bg-black/20 rounded-full sm:bg-transparent z-20 min-w-[2rem]" 
           // Collapsed
           : "w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 min-w-[2rem]",
        !isActive && getMedalColor(track.medal)
      )}>
        <MedalIcon />
      </div>

      {/* Artwork & Play Button */}
      <div 
        className={cn(
          "relative flex-shrink-0 bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center group/artwork isolate transition-all duration-500",
          isActive 
            ? "w-40 h-40 sm:w-32 sm:h-32 rounded-lg shadow-xl"
            : "w-10 h-10 sm:w-12 sm:h-12 rounded"
        )}
      >
        {metadata.artworkUrl ? (
          <>
            <img 
              src={metadata.artworkUrl} 
              alt={track.title} 
              crossOrigin="anonymous"
              className={cn(
                "w-full h-full object-cover transition-transform duration-700 ease-in-out",
                isActive ? "scale-100 opacity-90" : "opacity-80 group-hover:opacity-60 scale-100"
              )} 
            />
            
            {(metadata.previewUrl || isRetrying) && (
              <button 
                onClick={togglePlay}
                disabled={isRetrying}
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all duration-300 z-10",
                  isActive ? "bg-black/30 opacity-100" : "bg-black/40 opacity-0 group-hover/artwork:opacity-100",
                  isRetrying && "cursor-wait"
                )}
                title={isActive ? "Pause Preview" : "Play Preview"}
              >
                {/* Progress Ring */}
                {isActive && !isRetrying && (
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
                    <circle 
                      cx="20" cy="20" r="18" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      className="text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] transition-all duration-150 ease-linear"
                      strokeDasharray="113.1" 
                      strokeDashoffset={113.1 - (113.1 * progress) / 100} 
                      strokeLinecap="round" 
                    />
                  </svg>
                )}

                {isRetrying ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : isActive ? (
                  <Pause className="w-8 h-8 text-white fill-current relative z-20 drop-shadow-lg" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-current relative z-20 pl-0.5" />
                )}
              </button>
            )}
          </>
        ) : (
          <Music2 className={cn("text-zinc-700", isActive ? "w-10 h-10" : "w-5 h-5")} />
        )}
      </div>

      {/* Track Info */}
      <div className={cn(
        "flex-grow min-w-0 flex flex-col justify-center gap-0.5 transition-all duration-500",
        isActive ? "items-center sm:items-start text-center sm:text-left w-full sm:w-auto" : ""
      )}>
        <h3 className={cn(
          "font-medium pr-2 transition-all duration-500",
          isActive ? "text-xl sm:text-2xl text-white mb-1 whitespace-normal break-all" : "text-sm sm:text-base text-zinc-200 group-hover:text-white truncate"
        )}>
          {track.title}
        </h3>
        <div className={cn(
          "flex transition-all duration-500",
          isActive ? "flex-col items-center sm:items-start" : "flex-row items-center gap-2"
        )}>
          <span className={cn(
            "truncate transition-all duration-500",
             isActive ? "text-base sm:text-lg text-zinc-400" : "text-xs text-zinc-500"
          )}>
            {track.artists}
          </span>
          
          {/* Submitter */}
          {track.submitted_by && (
             <span className={cn(
               "flex items-center gap-1.5 transition-all duration-700 ease-out",
               isActive 
                 ? "mt-2 opacity-100 translate-y-0 text-sm text-zinc-500/80 delay-100" 
                 : "hidden sm:inline-flex opacity-50 text-xs ml-0"
             )}>
              <span className={isActive ? "hidden" : "hidden sm:inline"}>•</span>
              <User className={isActive ? "w-3.5 h-3.5" : "w-3 h-3"} />
              <span>@{track.submitted_by}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={cn(
        "flex items-center transition-all duration-500",
        isActive ? "flex-wrap gap-4 sm:gap-2 opacity-100 justify-center w-full sm:w-auto pt-4 sm:pt-0" : "gap-1 opacity-0 group-hover:opacity-100 ml-auto"
      )}>
        
        <a 
          href={getSearchUrl('spotify')}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-full transition-colors flex items-center justify-center",
            isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#1DB954] hover:text-white sm:scale-100" : "p-1.5 sm:p-2 hover:bg-[#1DB954]/10 hover:text-[#1DB954] text-zinc-600"
          )}
          title="Search on Spotify"
        >
          <SpotifyLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
        </a>

        <a 
          href={getSearchUrl('apple')}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-full transition-colors flex items-center justify-center",
            isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#FA243C] hover:text-white sm:scale-100" : "p-1.5 sm:p-2 hover:bg-[#FA243C]/10 hover:text-[#FA243C] text-zinc-600"
          )}
          title="Search on Apple Music"
        >
          <AppleLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
        </a>

        <a 
          href={getSearchUrl('soundcloud')}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-full transition-colors flex items-center justify-center",
            isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#FF5500] hover:text-white sm:scale-100" : "p-1.5 sm:p-2 hover:bg-[#FF5500]/10 hover:text-[#FF5500] text-zinc-600"
          )}
          title="Search on SoundCloud"
        >
          <SoundcloudLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
        </a>
        
        <a 
          href={getSearchUrl('youtube')}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-full transition-colors flex items-center justify-center",
            isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-white sm:scale-100" : "p-1.5 sm:p-2 hover:bg-red-500/10 hover:text-red-500 text-zinc-600"
          )}
          title="Search on YouTube"
        >
          <YoutubeLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
        </a>
      </div>
    </div>
  );
}