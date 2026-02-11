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
  selectedIndex: number;
}

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="text-indigo-400 font-bold">{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
};

export const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onSelectUser, onSelectResult, weeks, selectedIndex }) => {
  const userResults = results.filter(r => r.type === 'user');
  const trackResults = results.filter(r => r.type === 'track');

  const getWeekInfo = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? `${week.week_number}-oji Savaitė` : 'Nežinoma';
  };

  if (results.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-600">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
            <Search className="w-6 h-6 opacity-50" />
        </div>
        <p className="text-lg font-medium text-zinc-400">Nieko nerasta</p>
        <p className="text-sm">Bandykite keisti užklausą</p>
      </div>
    );
  }

  // Calculate offsets for indices
  const trackStartIndex = userResults.length;

  return (
    <div className="space-y-6">
      {/* USER RESULTS */}
      {userResults.length > 0 && (
        <div>
           <div className="px-1 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <User className="w-3 h-3" />
              <span>Vartotojai</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {userResults.map((res, idx) => {
                const isSelected = selectedIndex === idx;
                return res.username && (
                    <button
                        key={`user-${res.username}-${idx}`}
                        onClick={() => onSelectUser(res.username!)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all group text-left",
                          isSelected 
                             ? "bg-zinc-800 border-zinc-600 ring-1 ring-indigo-500/30" 
                             : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                        )}
                    >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border transition-all",
                          isSelected 
                            ? "bg-indigo-500 text-white border-indigo-400 scale-105" 
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        )}>
                            {res.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className={cn("text-sm font-bold transition-colors", isSelected ? "text-white" : "text-zinc-200")}>
                                <Highlight text={res.username} query={query} />
                            </div>
                            <div className={cn("text-xs flex items-center gap-1", isSelected ? "text-zinc-400" : "text-zinc-500")}>
                                <span>Rasta rezultatų: {res.count}</span>
                            </div>
                        </div>
                        {isSelected && <CornerDownLeft className="w-4 h-4 text-zinc-500 ml-auto" />}
                    </button>
                );
              })}
           </div>
        </div>
      )}

      {/* TRACK RESULTS */}
      {trackResults.length > 0 && (
         <div>
            <div className="px-1 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mt-2">
                <Music className="w-3 h-3" />
                <span>Dainos</span>
            </div>
            <div className="space-y-1">
                {trackResults.map((res, idx) => {
                    const actualIdx = trackStartIndex + idx;
                    const isSelected = selectedIndex === actualIdx;
                    return res.data && (
                        <button
                            key={res.data.id}
                            onClick={() => onSelectResult(res.data!.week_id, res.data!.id)}
                            className={cn(
                              "w-full text-left group flex items-center gap-4 px-4 py-3 rounded-lg border transition-all",
                              isSelected 
                                ? "bg-zinc-800 border-zinc-600 ring-1 ring-white/5" 
                                : "bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                                res.data.medal === 'gold' ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30" :
                                res.data.medal === 'silver' ? "bg-slate-400/10 text-slate-400 ring-1 ring-slate-400/30" :
                                res.data.medal === 'bronze' ? "bg-amber-600/10 text-amber-600 ring-1 ring-amber-600/30" :
                                isSelected ? "bg-zinc-700 text-zinc-300" : "bg-zinc-900 text-zinc-500"
                            )}>
                                #{res.data.position}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-0.5">
                                    <span className={cn("font-medium truncate transition-colors text-base", isSelected ? "text-white" : "text-zinc-200")}>
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
                            
                            {isSelected && <CornerDownLeft className="w-4 h-4 text-zinc-500" />}
                        </button>
                    );
                })}
            </div>
         </div>
      )}
    </div>
  );
};