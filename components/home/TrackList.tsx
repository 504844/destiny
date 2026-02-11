import React from 'react';
import { Track, Week } from '../../types';
import { TrackItem } from '../TrackItem';
import { SpotifyLogo, MusicNote } from '@phosphor-icons/react';
import { Disc3 } from 'lucide-react';

interface TrackListProps {
  currentWeek: Week;
  tracks: Track[];
  loadingTracks: boolean;
  playingTrackId: string | null;
  onPlayTrack: (id: string) => void;
  onStopTrack: () => void;
  onColorChange: (color: string | null) => void;
  highlightedTrackId: string | null;
}

export const TrackList: React.FC<TrackListProps> = ({
  currentWeek,
  tracks,
  loadingTracks,
  playingTrackId,
  onPlayTrack,
  onStopTrack,
  onColorChange,
  highlightedTrackId
}) => {
  return (
    <>
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <MusicNote className="w-4 h-4" />
          <span>Dainos: {currentWeek.track_count}</span>
        </div>
        {currentWeek.spotify_url && (
          <a 
            href={currentWeek.spotify_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 hover:bg-[#1DB954]/10 hover:border-[#1DB954]/30 hover:text-[#1DB954] text-zinc-400 text-xs font-medium transition-all group"
          >
            <SpotifyLogo weight="fill" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Spotify
          </a>
        )}
      </div>

      <div className="space-y-2">
        {loadingTracks ? (
          Array.from({ length: 6 }).map((_, i) => (
             <div key={i} className="flex items-center gap-3 sm:gap-4 px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-zinc-900/20 border border-zinc-800/50">
                 {/* Position Skeleton */}
                 <div className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse shrink-0" />
                 {/* Artwork Skeleton */}
                 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-zinc-800/50 animate-pulse shrink-0" />
                 {/* Text Skeleton */}
                 <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-32 sm:w-48 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-3 w-20 sm:w-24 bg-zinc-800/50 rounded animate-pulse" />
                 </div>
             </div>
          ))
        ) : tracks.length > 0 ? (
          <div className="grid gap-2">
            {tracks.map((track) => (
              <TrackItem 
                // CRITICAL: We use track.position as key so the row component persists 
                // across week switches. This allows the internal content to animate (blur-in)
                // while the number box stays static.
                key={`pos-${track.position}`} 
                track={track} 
                isActive={playingTrackId === track.id}
                onPlay={() => onPlayTrack(track.id)}
                onStop={onStopTrack}
                onColorChange={onColorChange}
                isHighlighted={highlightedTrackId === track.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
            <Disc3 className="w-10 h-10 mb-3 opacity-20" />
            <p>Šiai savaitei dainų nėra.</p>
          </div>
        )}
      </div>
    </>
  );
};