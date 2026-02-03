import React from 'react';
import { DraftTrack } from '../../types';
import { DraftTrackWithId } from '../../lib/parsers';
import { Trash2 } from 'lucide-react';

interface TrackEditorItemProps {
  track: DraftTrackWithId;
  onUpdate: (id: string, field: keyof DraftTrack, value: any) => void;
  onDelete: (id: string) => void;
}

export const TrackEditorItem: React.FC<TrackEditorItemProps> = ({ track, onUpdate, onDelete }) => {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700 transition-all">
      {/* Position */}
      <div className="w-12 shrink-0">
        <label className="block text-[10px] text-zinc-500 mb-1 uppercase text-center">Poz.</label>
        <input 
          type="number" 
          value={track.position} 
          onChange={(e) => onUpdate(track._id, 'position', parseInt(e.target.value) || 1)}
          className={`w-full bg-zinc-950 border border-zinc-800 rounded text-center text-sm py-1 font-mono focus:ring-1 focus:ring-white/20 outline-none ${
            track.medal === 'gold' ? 'text-yellow-500 font-bold' : 
            track.medal === 'silver' ? 'text-slate-400 font-bold' : 
            track.medal === 'bronze' ? 'text-amber-600 font-bold' : 'text-zinc-400'
          }`}
        />
      </div>

      {/* Main Info */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <label className="block text-[10px] text-zinc-500 uppercase">Atlikėjas</label>
            <input 
              value={track.artists}
              onChange={(e) => onUpdate(track._id, 'artists', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
              placeholder="Atlikėjas"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[10px] text-zinc-500 uppercase">Pavadinimas</label>
            <input 
              value={track.title}
              onChange={(e) => onUpdate(track._id, 'title', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-zinc-200 font-medium placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
              placeholder="Pavadinimas"
            />
          </div>
        </div>
        <div className="space-y-0.5 relative">
          <label className="block text-[10px] text-zinc-500 uppercase">Siūlė</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">@</span>
            <input 
              value={track.submitted_by || ''}
              onChange={(e) => onUpdate(track._id, 'submitted_by', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-6 pr-2.5 py-1.5 text-sm text-zinc-400 placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
              placeholder="Vartotojas"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-6 shrink-0">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(track._id);
          }}
          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          title="Ištrinti dainą"
        >
          <Trash2 className="w-4 h-4 pointer-events-none" />
        </button>
      </div>
    </div>
  );
};