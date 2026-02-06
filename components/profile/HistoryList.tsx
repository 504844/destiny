import React, { useMemo } from 'react';
import { Disc3 } from 'lucide-react';
import { Track, Week } from '../../types';
import { cn, formatLithuanianDate } from '../../lib/utils';

interface HistoryListProps {
  tracks: Track[];
  weeks: Week[];
  onTrackClick: (weekId: string, trackId: string) => void;
  isLoading?: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ tracks, weeks, onTrackClick, isLoading }) => {
  
  // Group tracks by week_id
  const groupedTracks = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    
    tracks.forEach(track => {
      if (!groups[track.week_id]) {
        groups[track.week_id] = [];
      }
      groups[track.week_id].push(track);
    });

    // Sort tracks within groups by position
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => a.position - b.position);
    });

    // Create an array of groups sorted by week date (descending)
    return Object.entries(groups)
      .map(([weekId, groupTracks]) => {
        const week = weeks.find(w => w.id === weekId);
        return {
          weekId,
          week,
          tracks: groupTracks
        };
      })
      .sort((a, b) => {
        if (!a.week || !b.week) return 0;
        return b.week.week_number - a.week.week_number;
      });
  }, [tracks, weeks]);

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-6 px-1 flex items-center gap-2">
         <Disc3 className="w-5 h-5 text-indigo-500" />
         Dainų Istorija
      </h3>
      
      <div className="space-y-8">
          {isLoading ? (
             <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-2 pr-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse shrink-0" />
                        <div className="w-12 h-12 rounded-md bg-zinc-800/50 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-3 w-1/4 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
             </div>
          ) : (
            groupedTracks.map(({ weekId, week, tracks }) => (
              <div key={weekId} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Mini Header */}
                  <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="h-px bg-zinc-800 flex-1" />
                      <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-white">{week ? `${week.week_number}-oji savaitė` : 'Nežinoma savaitė'}</span>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500">{formatLithuanianDate(week?.date_range)}</span>
                      </div>
                      <div className="h-px bg-zinc-800 flex-1" />
                  </div>

                  {/* Tracks Grid */}
                  <div className="grid gap-2">
                      {tracks.map((track) => (
                          <button
                              key={track.id}
                              onClick={() => onTrackClick(track.week_id, track.id)}
                              className="w-full group flex items-center gap-4 p-2 pr-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left overflow-hidden relative"
                          >
                              {/* Position/Medal Box */}
                              <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0",
                                  track.medal === 'gold' ? 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30' :
                                  track.medal === 'silver' ? 'bg-slate-400/10 text-slate-400 ring-1 ring-slate-400/30' :
                                  track.medal === 'bronze' ? 'bg-amber-700/10 text-amber-700 ring-1 ring-amber-700/30' :
                                  'bg-zinc-950 border border-zinc-800 text-zinc-500'
                              )}>
                                  <span className="opacity-50 mr-px">#</span>{track.position}
                              </div>

                              {/* Artwork Thumb (No audio preview interaction in history mode for simplicity) */}
                              <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-zinc-950 border border-zinc-800">
                                  {track.artwork_url ? (
                                      <img src={track.artwork_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                          <Disc3 className="w-5 h-5" />
                                      </div>
                                  )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                  <div className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                                      {track.title}
                                  </div>
                                  <div className="text-xs text-zinc-500 truncate">
                                      {track.artists}
                                  </div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          ))
        )}
      </div>
    </div>
  );
};
