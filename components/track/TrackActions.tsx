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
      isActive ? "flex-wrap gap-4 sm:gap-2 opacity-100 justify-center w-full sm:w-auto pt-4 sm:pt-0" : "gap-1 opacity-0 group-hover:opacity-100 ml-auto"
    )}>

      <a
        href={getSearchUrl(track, 'spotify')}
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
        href={getSearchUrl(track, 'apple')}
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
        href={getSearchUrl(track, 'soundcloud')}
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
        href={getSearchUrl(track, 'youtube')}
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
  );
};