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
      "flex-grow min-w-0 flex flex-col justify-center gap-0.5 transition-all duration-500 text-left",
    )}>
      <h3 className={cn(
        "font-medium pr-2 transition-all duration-500 leading-tight",
        isActive ? "text-lg sm:text-2xl text-white mb-1 whitespace-normal break-words" : "text-sm sm:text-base text-zinc-200 group-hover:text-white truncate"
      )}>
        {title}
      </h3>
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:items-center transition-all duration-500",
        isActive ? "gap-1 sm:gap-2" : "gap-2"
      )}>
        <span className={cn(
          "transition-all duration-500 font-medium",
           // Changed to whitespace-normal when active to prevent cutoff
           isActive ? "text-base sm:text-lg text-zinc-400 whitespace-normal break-words" : "text-xs text-zinc-500 truncate"
        )}>
          {artists}
        </span>

        <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-0">
            {/* Submitter - Priority 1 (Moved before Genre) */}
            {submittedBy && (
               <span className={cn(
                 "flex items-center gap-1.5 transition-all duration-700 ease-out",
                 isActive
                   ? "opacity-100 text-sm text-zinc-500/80"
                   : "hidden sm:inline-flex opacity-50 text-xs text-zinc-500"
               )}>
                <span className="hidden sm:inline">•</span>
                <User className={isActive ? "w-3.5 h-3.5" : "w-3 h-3"} />
                <span>@{submittedBy}</span>
              </span>
            )}

            {/* Genre Badge - Priority 2 (Least important, subtle styling) */}
            {genre && (
                <span className={cn(
                  "inline-flex items-center px-1.5 py-px rounded border text-[9px] font-medium uppercase tracking-wider transition-all duration-500 select-none",
                  isActive 
                    ? "bg-white/5 border-white/10 text-white/30" 
                    : "bg-zinc-800/30 border-zinc-800/50 text-zinc-600"
                )}>
                  {genre}
                </span>
            )}
        </div>
      </div>
    </div>
  );
};