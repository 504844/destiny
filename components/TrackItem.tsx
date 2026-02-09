import React, { useEffect, useState, useRef } from 'react';
import { Track } from '../types';
import { cn } from '../lib/utils';
import { useTrackMetadata } from '../hooks/useTrackMetadata';

import { TrackArtwork } from './track/TrackArtwork';
import { TrackInfo } from './track/TrackInfo';
import { TrackActions } from './track/TrackActions';

interface TrackItemProps {
  track: Track;
  isActive: boolean;
  onPlay: () => void;
  onStop: () => void;
  onColorChange?: (color: string | null) => void;
  isHighlighted?: boolean;
}

export const TrackItem: React.FC<TrackItemProps> = ({ track, isActive, onPlay, onStop, onColorChange, isHighlighted }) => {
  // Use custom hook for data
  const { 
    metadata, 
    isRetrying, 
    dominantColor, 
    healMetadata 
  } = useTrackMetadata(track);

  const [progress, setProgress] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to view if highlighted
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

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

    const playAudio = async () => {
      // Force creation of new audio if it doesn't exist or URL changed
      if (!audioRef.current || audioRef.current.src !== metadata.previewUrl) {
          if (!metadata.previewUrl) return; 
          
          const newAudio = new Audio(metadata.previewUrl);
          newAudio.volume = 0.5;
          
          newAudio.onended = () => {
            if (!isCancelled) {
              onStop();
            }
          };
          
          newAudio.ontimeupdate = () => {
             if (!isCancelled && newAudio.duration) {
               setProgress((newAudio.currentTime / newAudio.duration) * 100);
             }
          };
          
          newAudio.onerror = async (e) => {
            if (isCancelled) return;
            console.warn("Audio playback failed. Attempting heal...", e);
            const newUrl = await healMetadata();
            if (!newUrl) {
                onStop();
            }
          };

          audioRef.current = newAudio;
      }
      
      const currentAudio = audioRef.current;
      
      try {
        if (isCancelled) return;
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            await playPromise;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Play failed:", err);
      }
    };

    if (isActive) {
      playAudio();
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Help GC
        audioRef.current = null;
      }
      setProgress(0);
      if (onColorChange) onColorChange(null);
    }

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isActive, metadata.previewUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!metadata.previewUrl && !isRetrying) return;

    if (isActive) {
      onStop();
    } else {
      onPlay();
    }
  };

  const expandedStyle = isActive && dominantColor ? {
    background: `linear-gradient(135deg, ${dominantColor}33 0%, #18181b 100%)`, 
    borderColor: `${dominantColor}66`, 
    boxShadow: `0 20px 40px -5px ${dominantColor}22` 
  } : undefined;

  const getRankStyle = (medal: string | null) => {
     switch (medal) {
        case 'gold': return 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30 border-transparent';
        case 'silver': return 'bg-slate-400/10 text-slate-400 ring-1 ring-slate-400/30 border-transparent';
        case 'bronze': return 'bg-amber-700/10 text-amber-700 ring-1 ring-amber-700/30 border-transparent';
        default: return 'bg-zinc-950 border border-zinc-800 text-zinc-500';
     }
  };

  return (
    <div 
      ref={itemRef}
      className={cn(
        "group relative flex items-center rounded-xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isActive 
          ? "flex-wrap sm:flex-nowrap py-4 px-3 sm:py-6 sm:px-4 gap-4 sm:gap-6 my-6 bg-zinc-900 border border-zinc-700 shadow-2xl scale-100 sm:scale-[1.03] z-10 w-full" 
          : "gap-3 sm:gap-4 px-3 py-2 sm:px-4 sm:py-3 border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/60",
        isHighlighted && !isActive && "ring-2 ring-white/50 bg-zinc-800/60 scale-[1.02] shadow-lg shadow-white/10"
      )}
      style={expandedStyle}
    >
      {/* Position / Medal - Always Visible to prevent jumping */}
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center transition-all duration-500 rounded-lg w-8 h-8 min-w-[2rem]",
        getRankStyle(track.medal),
        isActive && "bg-transparent ring-0 border-0 shadow-none text-white/40 scale-110" // Subtle fade when active
      )}>
        <span className={cn("text-sm font-bold font-mono transition-colors", isActive && "text-white/60")}>
            <span className={cn("opacity-50 mr-0.5", isActive && "opacity-30")}>#</span>{track.position}
        </span>
      </div>

      <TrackArtwork 
        artworkUrl={metadata.artworkUrl}
        title={track.title}
        isActive={isActive}
        isRetrying={isRetrying}
        hasPreview={!!metadata.previewUrl}
        progress={progress}
        onTogglePlay={togglePlay}
      />

      <TrackInfo 
        title={track.title} 
        artists={track.artists} 
        submittedBy={track.submitted_by} 
        isActive={isActive} 
      />

      {/* Force a break on mobile active state to put actions on new line */}
      <div className={cn("hidden sm:hidden w-full h-0", isActive && "block basis-full")} />

      <TrackActions 
        track={track} 
        isActive={isActive} 
      />
    </div>
  );
};