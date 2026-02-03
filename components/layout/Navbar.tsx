import React from 'react';
import { Disc3, Search } from 'lucide-react';
import { TikTokIcon, InstagramIcon, DiscordIcon } from '../Icons';

interface NavbarProps {
  onLogoClick: () => void;
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogoClick, onSearchClick }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5 z-50 transition-all">
      <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
        <div 
          onClick={onLogoClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
             <Disc3 className="w-5 h-5 text-white animate-[spin_8s_linear_infinite]" />
          </div>
          <div className="flex flex-col gap-0.5">
             <h1 className="text-sm font-bold tracking-wider text-white leading-none">DJ DESTINY</h1>
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">Savaitės top</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <a href="https://www.tiktok.com/@destinydjbbx" target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><TikTokIcon className="w-5 h-5" /></a>
          <a href="https://www.instagram.com/the.destinydj/" target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><InstagramIcon className="w-5 h-5" /></a>
          <a href="https://discord.gg/xjaKD5c22Y" target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><DiscordIcon className="w-5 h-5" /></a>
          <button onClick={onSearchClick} className="sm:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Search className="w-5 h-5" /></button>
        </div>
      </div>
    </nav>
  );
};