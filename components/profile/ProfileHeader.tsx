import React from 'react';
import { Music, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProfileHeaderProps {
  username: string;
  totalTracks: number;
  avgPos: string;
  isLoading: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, totalTracks, avgPos, isLoading }) => {
  // Generate a consistent color based on username
  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const userColor = getColor(username);

  if (isLoading) {
    return (
      <div className="relative w-full rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-900/50 shadow-2xl mb-8 select-none">
        <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-8">
          {/* Avatar Skeleton */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-zinc-800 animate-pulse shrink-0 border border-zinc-700/50" />
          
          {/* Text Content Skeleton */}
          <div className="flex-1 w-full flex flex-col items-center sm:items-start space-y-4">
             <div className="h-10 sm:h-12 w-48 sm:w-64 bg-zinc-800 rounded-lg animate-pulse" />
             <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
             <div className="flex gap-3 pt-2">
                <div className="h-9 w-24 bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-9 w-24 bg-zinc-800 rounded-full animate-pulse" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-900/50 shadow-2xl mb-8 group select-none">
      
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0">
        {/* Main colored orb */}
        <div 
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-1000"
            style={{ backgroundColor: userColor }}
        />
        {/* Secondary orb */}
        <div 
            className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000"
            style={{ backgroundColor: userColor }}
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />
      </div>

      <div className="relative z-10 p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-8">
        
        {/* Avatar Container */}
        <div className="relative shrink-0">
            <div className="absolute inset-0 bg-white/10 blur-xl rounded-full scale-110" />
            <div 
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-zinc-950 flex items-center justify-center text-5xl font-black text-white shadow-2xl border border-white/10"
                style={{ boxShadow: `0 0 40px -10px ${userColor}40` }}
            >
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
                    {username.charAt(0).toUpperCase()}
                </span>
                
                {/* Contributor Badge */}
                <div className="absolute -bottom-3 -right-3 bg-zinc-900 border border-zinc-700 p-1.5 rounded-full shadow-lg" title="Verified Contributor">
                    <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                </div>
            </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 text-center sm:text-left space-y-3">
           <div className="space-y-1">
               <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg">
                   {username}
               </h1>
               <div className="flex items-center justify-center sm:justify-start gap-2">
                   <div className="h-0.5 w-8 bg-gradient-to-r from-zinc-500 to-transparent rounded-full" />
                   <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">DJ Destiny Legend</p>
               </div>
           </div>

           {/* Quick Stats Pills */}
           <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50 backdrop-blur-sm">
                   <Music className="w-4 h-4 text-indigo-400" />
                   <span className="text-sm font-semibold text-zinc-200">{totalTracks} <span className="text-zinc-500 font-normal">Dainos</span></span>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50 backdrop-blur-sm">
                   <TrendingUp className="w-4 h-4 text-emerald-400" />
                   <span className="text-sm font-semibold text-zinc-200">#{avgPos} <span className="text-zinc-500 font-normal">Vid. Pozicija</span></span>
               </div>
           </div>
        </div>

      </div>
    </div>
  );
};