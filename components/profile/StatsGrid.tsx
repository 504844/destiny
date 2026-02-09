import React from 'react';
import { Trophy, Medal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatsGridProps {
  stats: {
    gold: number;
    silver: number;
    bronze: number;
  };
  isLoading: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, isLoading }) => {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-12">
      
      {/* GOLD */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-zinc-900/50 border border-yellow-500/20 p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:border-yellow-500/40 transition-all duration-300">
          <div className="absolute inset-0 bg-yellow-500/5 blur-xl group-hover:bg-yellow-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/30 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            </div>
            {isLoading ? (
               <div className="h-8 sm:h-10 w-12 bg-zinc-800/50 rounded animate-pulse my-0.5" />
            ) : (
               <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stats.gold}</span>
            )}
            <span className="text-[10px] sm:text-xs font-bold text-yellow-500/80 uppercase tracking-widest">Auksas</span>
          </div>
      </div>

      {/* SILVER */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-400/10 to-zinc-900/50 border border-slate-400/20 p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:border-slate-400/40 transition-all duration-300">
          <div className="absolute inset-0 bg-slate-400/5 blur-xl group-hover:bg-slate-400/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-slate-400/10 ring-1 ring-slate-400/30 group-hover:scale-110 transition-transform duration-300">
                <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]" />
            </div>
            {isLoading ? (
               <div className="h-8 sm:h-10 w-12 bg-zinc-800/50 rounded animate-pulse my-0.5" />
            ) : (
               <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stats.silver}</span>
            )}
            <span className="text-[10px] sm:text-xs font-bold text-slate-400/80 uppercase tracking-widest">Sidabras</span>
          </div>
      </div>

      {/* BRONZE */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-700/10 to-zinc-900/50 border border-amber-700/20 p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:border-amber-700/40 transition-all duration-300">
          <div className="absolute inset-0 bg-amber-700/5 blur-xl group-hover:bg-amber-700/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-amber-700/10 ring-1 ring-amber-700/30 group-hover:scale-110 transition-transform duration-300">
                <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 drop-shadow-[0_0_10px_rgba(180,83,9,0.5)]" />
            </div>
            {isLoading ? (
               <div className="h-8 sm:h-10 w-12 bg-zinc-800/50 rounded animate-pulse my-0.5" />
            ) : (
               <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stats.bronze}</span>
            )}
            <span className="text-[10px] sm:text-xs font-bold text-amber-700/80 uppercase tracking-widest">Bronza</span>
          </div>
      </div>

    </div>
  );
};