import React from 'react';
import { DraftTrack } from '../../types';
import { DraftTrackWithId } from '../../lib/parsers';
import { TrackEditorItem } from './TrackEditorItem';
import { FileText, Plus, RefreshCw } from 'lucide-react';

interface TrackEditorListProps {
  tracks: DraftTrackWithId[];
  onUpdate: (id: string, field: keyof DraftTrack, value: any) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export const TrackEditorList: React.FC<TrackEditorListProps> = ({ tracks, onUpdate, onDelete, onAdd }) => {
  return (
    <div className="bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Dainų Sąrašas ({tracks.length})
        </h3>
        <button 
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Pridėti dainą
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        {tracks.length > 0 ? (
          <div className="space-y-2">
            {tracks.map((track) => (
              <TrackEditorItem 
                key={track._id} 
                track={track} 
                onUpdate={onUpdate} 
                onDelete={onDelete} 
              />
            ))}
            
            <button 
              onClick={onAdd}
              className="w-full py-3 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Pridėti dar vieną dainą
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <RefreshCw className="w-10 h-10 opacity-20" />
            <p>Įklijuokite tekstą kairėje arba pridėkite rankiniu būdu</p>
            <button onClick={onAdd} className="text-zinc-400 hover:text-white underline text-sm">
              Pridėti tuščią dainą
            </button>
          </div>
        )}
      </div>
    </div>
  );
};