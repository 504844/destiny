import React from 'react';
import { cn } from '../../lib/utils';
import { SpotifyLogo, AppleLogo, SoundcloudLogo, YoutubeLogo } from '@phosphor-icons/react';
import { getSearchUrl } from '../../services/metadata';
import { Track } from '../../types';

interface TrackActionsProps {
  track: Track;
  isActive: boolean;
}

export const TrackActions: React.FC<TrackActionsProps> = ({ track, isActive }) => {
  return (
    <div className={cn(
      "flex items-center transition-all duration-500",
      isActive 
        ? "w-full sm:w-auto justify-center sm:justify-end gap-3 sm:gap-2 opacity-100 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 mt-2 sm:mt-0" 
        // Changed: opacity-100 by default (mobile), sm:opacity-0 (desktop hidden initially), sm:group-hover:opacity-100 (desktop hover)
        : "gap-1 ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
    )}>

      <a
        href={getSearchUrl(track, 'spotify')}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded-full transition-colors flex items-center justify-center",
          isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#1DB954] hover:text-white sm:scale-100 ring-1 ring-white/5" : "p-1.5 sm:p-2 hover:bg-[#1DB954]/10 hover:text-[#1DB954] text-zinc-600"
        )}
        title="Search on Spotify"
      >
        <SpotifyLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
      </a>

      <a
        href={getSearchUrl(track, 'apple')}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded-full transition-colors flex items-center justify-center",
          isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#FA243C] hover:text-white sm:scale-100 ring-1 ring-white/5" : "p-1.5 sm:p-2 hover:bg-[#FA243C]/10 hover:text-[#FA243C] text-zinc-600"
        )}
        title="Search on Apple Music"
      >
        <AppleLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
      </a>

      <a
        href={getSearchUrl(track, 'soundcloud')}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded-full transition-colors flex items-center justify-center",
          isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-[#FF5500] hover:text-white sm:scale-100 ring-1 ring-white/5" : "p-1.5 sm:p-2 hover:bg-[#FF5500]/10 hover:text-[#FF5500] text-zinc-600"
        )}
        title="Search on SoundCloud"
      >
        <SoundcloudLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
      </a>

      <a
        href={getSearchUrl(track, 'youtube')}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "rounded-full transition-colors flex items-center justify-center",
          isActive ? "p-3 bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-white sm:scale-100 ring-1 ring-white/5" : "p-1.5 sm:p-2 hover:bg-red-500/10 hover:text-red-500 text-zinc-600"
        )}
        title="Search on YouTube"
      >
        <YoutubeLogo weight="fill" className={cn(isActive ? "w-5 h-5" : "w-4 h-4")} />
      </a>
    </div>
  );
};