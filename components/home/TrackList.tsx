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
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-zinc-900/30 rounded-md animate-pulse border border-zinc-800/50" />
          ))
        ) : tracks.length > 0 ? (
          <div className="grid gap-2">
            {tracks.map((track) => (
              <TrackItem 
                key={track.id} 
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