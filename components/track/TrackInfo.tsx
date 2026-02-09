import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrackInfoProps {
  title: string;
  artists: string;
  submittedBy: string | null;
  isActive: boolean;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ title, artists, submittedBy, isActive }) => {
  return (
    <div className={cn(
      "flex-grow min-w-0 flex flex-col justify-center gap-0.5 transition-all duration-500 text-left",
      isActive ? "w-auto" : ""
    )}>
      <h3 className={cn(
        "font-medium pr-2 transition-all duration-500 leading-tight",
        isActive ? "text-lg sm:text-2xl text-white mb-1 whitespace-normal break-words" : "text-sm sm:text-base text-zinc-200 group-hover:text-white truncate"
      )}>
        {title}
      </h3>
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center transition-all duration-500",
        isActive ? "gap-1 sm:gap-2" : "gap-2"
      )}>
        <span className={cn(
          "truncate transition-all duration-500 font-medium",
           isActive ? "text-base sm:text-lg text-zinc-400" : "text-xs text-zinc-500"
        )}>
          {artists}
        </span>

        {/* Submitter */}
        {submittedBy && (
           <span className={cn(
             "flex items-center gap-1.5 transition-all duration-700 ease-out",
             isActive
               ? "opacity-100 text-sm text-zinc-500/80 mt-1 sm:mt-0"
               : "hidden sm:inline-flex opacity-50 text-xs"
           )}>
            <span className="hidden sm:inline">•</span>
            <User className={isActive ? "w-3.5 h-3.5" : "w-3 h-3"} />
            <span>@{submittedBy}</span>
          </span>
        )}
      </div>
    </div>
  );
};