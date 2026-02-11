import React from 'react';
import { History, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RecentSearchesProps {
  recentUsers: string[];
  onSelectUser: (username: string) => void;
  onRemoveUser: (e: React.MouseEvent, username: string) => void;
  selectedIndex: number;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({ recentUsers, onSelectUser, onRemoveUser, selectedIndex }) => {
  if (recentUsers.length === 0) return null;

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="px-1 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">
          <History className="w-3 h-3" />
          <span>Nesenai ieškota</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recentUsers.map((user, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
                key={`recent-${user}`}
                onClick={() => onSelectUser(user)}
                className={cn(
                  "relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all group text-left",
                  isSelected 
                    ? "bg-zinc-800 border-zinc-600 ring-1 ring-white/10" 
                    : "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700"
                )}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0",
                      isSelected 
                        ? "bg-indigo-500 text-white border-indigo-400" 
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}>
                        {user.charAt(0).toUpperCase()}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors truncate",
                      isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"
                    )}>
                        {user}
                    </span>
                </div>
                <div 
                  onClick={(e) => onRemoveUser(e, user)}
                  className={cn(
                    "p-1.5 rounded-md transition-all z-10",
                    isSelected 
                      ? "text-zinc-400 hover:text-red-300 hover:bg-red-500/20" 
                      : "text-zinc-600 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100"
                  )}
                  title="Pašalinti"
                >
                   <X className="w-3.5 h-3.5" />
                </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};