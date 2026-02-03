import React from 'react';
import { History, X } from 'lucide-react';

interface RecentSearchesProps {
  recentUsers: string[];
  onSelectUser: (username: string) => void;
  onRemoveUser: (e: React.MouseEvent, username: string) => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({ recentUsers, onSelectUser, onRemoveUser }) => {
  if (recentUsers.length === 0) return null;

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <History className="w-3 h-3" />
          <span>Nesenai ieškota</span>
      </div>
      <div className="space-y-1">
        {recentUsers.map((user) => (
          <button
              key={`recent-${user}`}
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/20 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group text-left"
          >
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold border border-zinc-700">
                      {user.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                      {user}
                  </span>
              </div>
              <div 
                onClick={(e) => onRemoveUser(e, user)}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                title="Pašalinti iš istorijos"
              >
                 <X className="w-3.5 h-3.5" />
              </div>
          </button>
        ))}
      </div>
    </div>
  );
};