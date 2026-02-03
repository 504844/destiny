import React from 'react';
import { Music, TrendingUp } from 'lucide-react';

interface ProfileHeaderProps {
  username: string;
  totalTracks: number;
  avgPos: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, totalTracks, avgPos }) => {
  // Generate a consistent gradient based on username
  const getGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 70%, 20%)`;
    const c2 = `hsl(${(hash + 60) % 360}, 70%, 10%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 mb-8">
      <div 
          className="absolute inset-0 opacity-50"
          style={{ background: getGradient(username) }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
        <div className="w-24 h-24 rounded-2xl bg-zinc-950 border-2 border-white/10 shadow-2xl flex items-center justify-center text-4xl font-bold text-white">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
           <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80 uppercase tracking-wider border border-white/5">
                  DJ Destiny Contributor
              </span>
           </div>
           <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{username}</h1>
           <p className="text-zinc-300 text-sm flex items-center justify-center md:justify-start gap-4">
             <span className="flex items-center gap-1.5"><Music className="w-4 h-4" /> {totalTracks} Dainų</span>
             <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Vid. Pozicija: #{avgPos}</span>
           </p>
        </div>
      </div>
    </div>
  );
};