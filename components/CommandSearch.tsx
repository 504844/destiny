import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Calendar, User, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Track, Week } from '../types';
import { cn, getMedalColor } from '../lib/utils';

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: Week[];
  onSelectResult: (weekId: string, trackId: string) => void;
}

export const CommandSearch: React.FC<CommandSearchProps> = ({ isOpen, onClose, weeks, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle keyboard interaction (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      
      // ILIKE query for title OR artist OR submitter
      // Note: This requires the db column types to be text.
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .or(`title.ilike.%${query}%,artists.ilike.%${query}%,submitted_by.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setResults(data as Track[]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getWeekInfo = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? `${week.week_number}-oji Savaitė` : 'Nežinoma savaitė';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[60vh]">
        
        {/* Header / Input */}
        <div className="flex items-center px-4 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-zinc-600 font-medium"
            placeholder="Ieškoti dainų, atlikėjų, vartotojų..."
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 font-mono">ESC</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 custom-scrollbar">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Rezultatai ({results.length})
              </div>
              {results.map((track) => (
                <button
                  key={track.id}
                  onClick={() => onSelectResult(track.week_id, track.id)}
                  className="w-full text-left group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
                >
                  {/* Position/Medal Indicator */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold shrink-0",
                    track.medal === 'gold' ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                    track.medal === 'silver' ? "bg-slate-400/10 border-slate-400/30 text-slate-400" :
                    track.medal === 'bronze' ? "bg-amber-600/10 border-amber-600/30 text-amber-600" :
                    "bg-zinc-900 border-zinc-800 text-zinc-500"
                  )}>
                    {track.position}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                        {track.title}
                      </span>
                      <span className="text-zinc-600 text-sm">•</span>
                      <span className="text-zinc-400 text-sm truncate">{track.artists}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{getWeekInfo(track.week_id)}</span>
                      </div>
                      {track.submitted_by && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{track.submitted_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            !loading && (
              <div className="py-12 text-center text-zinc-600">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nieko nerasta.</p>
              </div>
            )
          ) : (
            <div className="py-12 text-center text-zinc-600">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Įveskite paiešką...</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-zinc-900/50 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
           <span>Naudokite rodykles navigacijai</span>
           <span>DJ Destiny Search</span>
        </div>
      </div>
    </div>
  );
};