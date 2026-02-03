import React from 'react';
import { Calendar } from 'lucide-react';
import { Track } from '../../types';

interface HistoryListProps {
  tracks: Track[];
  onTrackClick: (weekId: string, trackId: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ tracks, onTrackClick }) => {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4 px-1">Dainų Istorija</h3>
      <div className="space-y-2">
          {tracks.map((track) => (
              <button
                  key={track.id}
                  onClick={() => onTrackClick(track.week_id, track.id)}
                  className="w-full group flex items-center gap-4 p-3 rounded-xl bg-zinc-900/20 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left"
              >
                  {/* Position/Medal */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border shrink-0 ${
                      track.medal === 'gold' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                      track.medal === 'silver' ? 'bg-slate-400/10 border-slate-400/30 text-slate-400' :
                      track.medal === 'bronze' ? 'bg-amber-700/10 border-amber-700/30 text-amber-700' :
                      'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}>
                      #{track.position}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                          {track.title}
                      </div>
                      <div className="text-sm text-zinc-500 truncate">
                          {track.artists}
                      </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-zinc-600 font-medium flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
                      <Calendar className="w-3 h-3" />
                      {new Date(track.created_at).toLocaleDateString('lt-LT')}
                  </div>
              </button>
          ))}
      </div>
    </div>
  );
};