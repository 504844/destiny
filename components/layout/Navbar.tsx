import React from 'react';
import { Disc3, Search, Command } from 'lucide-react';
import { TiktokLogo, InstagramLogo, DiscordLogo, YoutubeLogo } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

interface NavbarProps {
  onLogoClick: () => void;
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogoClick, onSearchClick }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-[72px] bg-zinc-950/60 backdrop-blur-xl border-b border-white/5 z-50 transition-all">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        
        {/* Logo Section */}
        <button 
          onClick={onLogoClick}
          className="flex items-center gap-3 group focus:outline-none shrink-0"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden group-hover:border-zinc-700 transition-colors">
             <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <Disc3 className="relative w-5 h-5 text-white animate-[spin_8s_linear_infinite]" />
          </div>
          <div className="hidden sm:flex flex-col items-start gap-0.5">
             <h1 className="text-sm font-black tracking-wider text-white leading-none group-hover:text-indigo-200 transition-colors">DJ DESTINY</h1>
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Topai</span>
             </div>
          </div>
        </button>

        {/* Desktop Search Trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 hover:ring-1 hover:ring-indigo-500/20 transition-all group w-full max-w-sm mx-4"
        >
          <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Ieškoti atlikėjų...</span>
          <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700">
             <Command className="w-2.5 h-2.5 text-zinc-500" />
             <span className="text-[10px] font-bold text-zinc-500">K</span>
          </div>
        </button>

        {/* Actions & Socials */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Mobile Search Icon */}
          <button 
             onClick={onSearchClick} 
             className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
             <Search className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>

          {/* Social Icons */}
          <SocialLink href="https://www.youtube.com/@DesTinYdjbbx" icon={<YoutubeLogo className="w-5 h-5" />} label="YouTube" />
          <SocialLink href="https://www.tiktok.com/@destinydjbbx" icon={<TiktokLogo className="w-5 h-5" />} label="TikTok" />
          <SocialLink href="https://www.instagram.com/the.destinydj/" icon={<InstagramLogo className="w-5 h-5" />} label="Instagram" />
          <SocialLink href="https://discord.gg/xjaKD5c22Y" icon={<DiscordLogo className="w-5 h-5" />} label="Discord" />
        </div>
      </div>
    </nav>
  );
};

const SocialLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all hover:scale-110 active:scale-95"
    title={label}
  >
    {icon}
  </a>
);