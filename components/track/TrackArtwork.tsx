import React from 'react';
import { cn } from '../../lib/utils';
import { Play, Pause, Loader2, Music2 } from 'lucide-react';

interface TrackArtworkProps {
  artworkUrl?: string;
  title: string;
  isActive: boolean;
  isRetrying: boolean;
  hasPreview: boolean;
  progress: number;
  onTogglePlay: (e: React.MouseEvent) => void;
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  artworkUrl,
  title,
  isActive,
  isRetrying,
  hasPreview,
  progress,
  onTogglePlay,
}) => {
  return (
    <div
      className={cn(
        "relative flex-shrink-0 bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center group/artwork isolate transition-all duration-500",
        isActive
          ? "w-40 h-40 sm:w-32 sm:h-32 rounded-2xl shadow-xl" // Increased rounding for premium feel when expanded
          : "w-10 h-10 sm:w-12 sm:h-12 rounded"
      )}
    >
      {artworkUrl ? (
        <>
          <img
            src={artworkUrl}
            alt={title}
            crossOrigin="anonymous"
            className={cn(
              "w-full h-full object-cover transition-transform duration-700 ease-in-out",
              isActive ? "scale-100 opacity-90" : "opacity-80 group-hover:opacity-60 scale-100"
            )}
          />

          {(hasPreview || isRetrying) && (
            <button
              onClick={onTogglePlay}
              disabled={isRetrying}
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-300 z-20",
                isActive ? "bg-black/20 opacity-100" : "bg-black/40 opacity-0 group-hover/artwork:opacity-100",
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
  );
};