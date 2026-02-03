import React from 'react';
import { User, ArrowRight, Music, Calendar, CornerDownLeft, Search } from 'lucide-react';
import { Track, Week } from '../../types';
import { cn } from '../../lib/utils';

interface SearchResultItem {
  type: 'track' | 'user';
  username?: string;
  count?: number;
  data?: Track;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  onSelectUser: (username: string) => void;
  onSelectResult: (weekId: string, trackId: string) => void;
  weeks: Week[];
}

// Helper component local to this file
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="text-white font-bold underline decoration-indigo-500/50 decoration-2 underline-offset-2">{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
};

export const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onSelectUser, onSelectResult, weeks }) => {
  const userResults = results.filter(r => r.type === 'user');
  const trackResults = results.filter(r => r.type === 'track');

  const getWeekInfo = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? `${week.week_number}-oji Savaitė` : 'Nežinoma';
  };

  if (results.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-600">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 opacity-50" />
        </div>
        <p className="text-lg font-medium text-zinc-400">Nieko nerasta</p>
        <p className="text-sm">Bandykite ieškoti dainos pavadinimo arba vartotojo vardo.</p>
      </div>
    );
  }

  return (
    <>
      {/* USER RESULTS GROUP */}
      {userResults.length > 0 && (
        <div className="mb-4">
           <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" />
              <span>Vartotojai</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2">
              {userResults.map((res, idx) => (
                res.username && (
                    <button
                        key={`user-${res.username}-${idx}`}
                        onClick={() => onSelectUser(res.username!)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 transition-all group text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg font-bold border border-indigo-500/20 group-hover:scale-110 transition-transform">
                            {res.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-zinc-200 group-hover:text-white">
                                <Highlight text={res.username} query={query} />
                            </div>
                            <div className="text-xs text-zinc-500 group-hover:text-zinc-400 flex items-center gap-1">
                                <span>Rasta rezultatų: {res.count}</span>
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </div>
                        </div>
                    </button>
                )
              ))}
           </div>
        </div>
      )}

      {/* TRACK RESULTS GROUP */}
      {trackResults.length > 0 && (
         <div>
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mt-2">
                <Music className="w-3 h-3" />
                <span>Dainos</span>
            </div>
            <div className="space-y-1">
                {trackResults.map((res) => (
                    res.data && (
                        <button
                            key={res.data.id}
                            onClick={() => onSelectResult(res.data!.week_id, res.data!.id)}
                            className="w-full text-left group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
                        >
                            {/* Position/Medal Indicator */}
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-110",
                                res.data.medal === 'gold' ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30" :
                                res.data.medal === 'silver' ? "bg-slate-400/10 text-slate-400 ring-1 ring-slate-400/30" :
                                res.data.medal === 'bronze' ? "bg-amber-600/10 text-amber-600 ring-1 ring-amber-600/30" :
                                "bg-zinc-800 text-zinc-500"
                            )}>
                                #{res.data.position}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-0.5">
                                    <span className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors text-base">
                                        <Highlight text={res.data.title} query={query} />
                                    </span>
                                    <span className="hidden sm:inline text-zinc-700 text-xs">•</span>
                                    <span className="text-zinc-500 text-sm truncate">
                                        <Highlight text={res.data.artists} query={query} />
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-zinc-600 group-hover:text-zinc-500">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{getWeekInfo(res.data.week_id)}</span>
                                </div>
                                {res.data.submitted_by && (
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span><Highlight text={res.data.submitted_by} query={query} /></span>
                                    </div>
                                )}
                                </div>
                            </div>
                            
                            <CornerDownLeft className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )
                ))}
            </div>
         </div>
      )}
    </>
  );
};