import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrackInfoProps {
  title: string;
  artists: string;
  submittedBy: string | null;
  isActive: boolean;
  genre?: string;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ title, artists, submittedBy, isActive, genre }) => {
  return (
    <div className={cn(
      "flex-grow min-w-0 flex flex-col justify-center transition-all duration-500",
      isActive ? "gap-2 text-center sm:text-left" : "gap-0.5 text-left"
    )}>
      {/* Song Title */}
      <h3 className={cn(
        "font-semibold transition-all duration-500 leading-tight",
        isActive 
          ? "text-lg sm:text-xl md:text-2xl text-white line-clamp-2" 
          : "text-sm sm:text-base text-zinc-200 group-hover:text-white line-clamp-1"
      )}>
        {title}
      </h3>

      {/* Active State: Stacked */}
      {isActive ? (
        <div className="flex flex-col gap-1.5 items-center sm:items-start">
          <div className="text-sm sm:text-base text-zinc-300 font-medium line-clamp-1">
            {artists}
          </div>
          
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm">
            {submittedBy && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60 shrink-0" />
                <span className="font-medium">@{submittedBy}</span>
              </div>
            )}
            
            {genre && submittedBy && <span className="text-zinc-700">•</span>}
            
            {genre && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                {genre}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Inactive State: Single row with priority for User visibility */
        <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-zinc-400">
          {/* Artist - Truncates if needed */}
          <span className="font-medium truncate">
            {artists}
          </span>

{submittedBy && (
  <div className="hidden sm:flex items-center gap-1 text-zinc-500/80 shrink-0">
    <span className="text-zinc-700 mx-px">•</span>
    <User className="w-2.5 h-2.5 opacity-60" />
    <span className="font-medium text-xs">@{submittedBy}</span>
  </div>
)}
        </div>
      )}
    </div>
  );
};