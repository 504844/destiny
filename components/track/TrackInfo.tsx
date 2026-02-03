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
      "flex-grow min-w-0 flex flex-col justify-center gap-0.5 transition-all duration-500",
      isActive ? "items-center sm:items-start text-center sm:text-left w-full sm:w-auto" : ""
    )}>
      <h3 className={cn(
        "font-medium pr-2 transition-all duration-500",
        isActive ? "text-xl sm:text-2xl text-white mb-1 whitespace-normal break-all" : "text-sm sm:text-base text-zinc-200 group-hover:text-white truncate"
      )}>
        {title}
      </h3>
      <div className={cn(
        "flex transition-all duration-500",
        isActive ? "flex-col items-center sm:items-start" : "flex-row items-center gap-2"
      )}>
        <span className={cn(
          "truncate transition-all duration-500",
           isActive ? "text-base sm:text-lg text-zinc-400" : "text-xs text-zinc-500"
        )}>
          {artists}
        </span>

        {/* Submitter */}
        {submittedBy && (
           <span className={cn(
             "flex items-center gap-1.5 transition-all duration-700 ease-out",
             isActive
               ? "mt-2 opacity-100 translate-y-0 text-sm text-zinc-500/80 delay-100"
               : "hidden sm:inline-flex opacity-50 text-xs ml-0"
           )}>
            <span className={isActive ? "hidden" : "hidden sm:inline"}>•</span>
            <User className={isActive ? "w-3.5 h-3.5" : "w-3 h-3"} />
            <span>@{submittedBy}</span>
          </span>
        )}
      </div>
    </div>
  );
};