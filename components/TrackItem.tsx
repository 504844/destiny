import React, { useEffect, useState, useRef } from 'react';
import { Track } from '../types';
import { cn, getMedalColor, getRowStyle } from '../lib/utils';
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
          
          // Healing Logic (Delegated to Hook)
          newAudio.onerror = async (e) => {
            console.warn("Audio playback failed. Attempting heal...", e);
            if (isCancelled) return;
            
            const newUrl = await healMetadata();
            
            if (!newUrl) {
                onStop();
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

      <TrackActions 
        track={track} 
        isActive={isActive} 
      />
    </div>
  );
};