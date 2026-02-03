import React from 'react';
import { Trophy, Medal } from 'lucide-react';

interface StatsGridProps {
  stats: {
    gold: number;
    silver: number;
    bronze: number;
    total: number;
    anyMedal: number;
  };
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-900/60 transition-colors">
          <Trophy className="w-6 h-6 text-yellow-500 mb-1" />
          <span className="text-2xl font-bold text-white">{stats.gold}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Auksas</span>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-900/60 transition-colors">
          <Medal className="w-6 h-6 text-slate-400 mb-1" />
          <span className="text-2xl font-bold text-white">{stats.silver}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sidabras</span>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-900/60 transition-colors">
          <Medal className="w-6 h-6 text-amber-700 mb-1" />
          <span className="text-2xl font-bold text-white">{stats.bronze}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Bronza</span>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-900/60 transition-colors">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500">
              %
          </div>
          <span className="text-2xl font-bold text-white">
              {stats.total > 0 ? Math.round((stats.anyMedal / stats.total) * 100) : 0}%
          </span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Win Rate</span>
      </div>
    </div>
  );
};