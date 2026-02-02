import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Week, Track } from './types';
import { WeekSelector } from './components/WeekSelector';
import { TrackItem } from './components/TrackItem';
import { AdminPanel } from './components/AdminPanel';
import { LoginModal } from './components/LoginModal';
import { CommandSearch } from './components/CommandSearch';
import { Disc3, PenLine, Search, Menu } from 'lucide-react';
import { SpotifyLogo, MusicNote } from '@phosphor-icons/react';
import { TikTokIcon, InstagramIcon, DiscordIcon } from './components/Icons';
import { cn } from './lib/utils';

const App: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [bgGradient, setBgGradient] = useState<string | null>(null);
  
  // Search & Highlight state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  
  // Lifted state for audio playback
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Admin Mode Logic
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  
  // null = hidden, 'create' = new upload, 'edit' = edit current
  const [adminPanelMode, setAdminPanelMode] = useState<'create' | 'edit' | null>(null);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        if (isAdmin) {
          setAdminPanelMode('create');
        } else {
          setShowLoginModal(true);
        }
        return 0;
      }
      return newCount;
    });
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setShowLoginModal(false);
    // After login, optionally open create mode immediately as per original flow
    setAdminPanelMode('create');
  };

  // Define fetchTracks outside useEffect so it can be called manually
  const fetchTracks = async (weekId: string) => {
    setLoadingTracks(true);
    setBgGradient(null); // Reset background when changing weeks
    setPlayingTrackId(null); // Stop playback when changing weeks

    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('week_id', weekId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
    } else if (data) {
      setTracks(data as Track[]);
    }
    setLoadingTracks(false);
  };

  const fetchWeeks = async (keepSelection?: string) => {
    setLoadingWeeks(true);
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false });

    if (error) {
      console.error('Error fetching weeks:', error);
    } else if (data) {
      setWeeks(data);
      
      // If a specific week ID is requested (e.g. after edit/create), select it
      if (keepSelection) {
        if (keepSelection === selectedWeekId) {
            fetchTracks(keepSelection);
        }
        setSelectedWeekId(keepSelection);
      } 
      // Otherwise, perform standard initialization logic
      else if (!selectedWeekId && data.length > 0) {
          const storedWeekId = localStorage.getItem('dj_destiny_selected_week');
          const weekExists = storedWeekId && data.some(w => w.id === storedWeekId);
          setSelectedWeekId(weekExists ? storedWeekId : data[0].id);
      } else if (selectedWeekId && !data.some(w => w.id === selectedWeekId)) {
          // If selected week no longer exists, select newest
          setSelectedWeekId(data[0].id);
      }
    }
    setLoadingWeeks(false);
  };

  // Fetch Weeks on Mount
  useEffect(() => {
    fetchWeeks();
  }, []);

  // Keyboard shortcut for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Search Result Selection
  const handleSearchResult = (weekId: string, trackId: string) => {
    setIsSearchOpen(false);
    if (selectedWeekId !== weekId) {
      setSelectedWeekId(weekId);
    }
    // Set highlight - TrackItem will use this to scrollIntoView or flash
    setHighlightedTrackId(trackId);
    
    // Clear highlight after animation
    setTimeout(() => {
      setHighlightedTrackId(null);
    }, 3000);
  };

  // Persist selected week to localStorage whenever it changes
  useEffect(() => {
    if (selectedWeekId) {
      localStorage.setItem('dj_destiny_selected_week', selectedWeekId);
    }
  }, [selectedWeekId]);

  // Fetch Tracks when Week Changes
  useEffect(() => {
    if (selectedWeekId) {
      fetchTracks(selectedWeekId);
    }
  }, [selectedWeekId]);

  const currentWeek = weeks.find(w => w.id === selectedWeekId);

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans overflow-x-hidden relative transition-colors duration-1000">
      
      <CommandSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
        weeks={weeks}
        onSelectResult={handleSearchResult}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginSuccess}
        />
      )}

      {/* Admin Panel Overlay */}
      {adminPanelMode && (
        <AdminPanel 
          onClose={() => setAdminPanelMode(null)} 
          initialData={adminPanelMode === 'edit' && currentWeek ? {
            weekId: currentWeek.id,
            weekNumber: currentWeek.week_number,
            dateRange: currentWeek.date_range,
            spotifyUrl: currentWeek.spotify_url || '',
            tracks: tracks
          } : null}
          onSuccess={(weekId) => {
            fetchWeeks(weekId); // Refresh data and select the edited/created week
          }} 
        />
      )}

      {/* Dynamic Ambient Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out"
        style={{
          background: bgGradient 
            ? `radial-gradient(circle at 50% 10%, ${bgGradient}15 0%, transparent 60%), radial-gradient(circle at 50% 90%, ${bgGradient}10 0%, transparent 50%)`
            : 'transparent',
          opacity: bgGradient ? 1 : 0
        }}
      />

      {/* Subtle Grid Pattern Background */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      {/* Professional Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5 z-50 transition-all">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div 
            onClick={handleLogoClick}
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

          {/* Right Actions / Socials */}
          <div className="flex items-center gap-1 sm:gap-2">
            <a 
              href="https://www.tiktok.com/@destinydjbbx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="TikTok"
            >
              <TikTokIcon className="w-5 h-5" />
            </a>
            <a 
              href="https://www.instagram.com/the.destinydj/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Instagram"
            >
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a 
              href="https://discord.gg/xjaKD5c22Y" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Discord"
            >
              <DiscordIcon className="w-5 h-5" />
            </a>
            
            {/* Search Trigger (Mobile Only - Optional, can keep main one below) */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-24 pb-12 w-full">
        
        {/* Page Title / Hero Text */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 inline-block">
             Savaitės top 
           </h2>
           <p className="text-zinc-500 text-sm mt-1">Jūsų grotų dainų topai</p>
        </div>

        <main className="space-y-6">
          
          {/* Controls Bar - Sticky below Header */}
          <div className="sticky top-20 z-40 flex justify-center pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/60 shadow-2xl ring-1 ring-white/5">
              <WeekSelector 
                weeks={weeks} 
                selectedWeekId={selectedWeekId} 
                onSelectWeek={setSelectedWeekId}
                isLoading={loadingWeeks}
              />
              
              <div className="w-px h-6 bg-zinc-800 mx-0.5"></div>

              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                title="Paieška (Cmd+K)"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Edit Button - Only visible if Admin */}
              {isAdmin && currentWeek && (
                <button
                  onClick={() => setAdminPanelMode('edit')}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all"
                  title="Redaguoti šią savaitę"
                >
                  <PenLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {loadingWeeks ? (
             <div className="flex items-center justify-center h-48 text-zinc-600">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                  <span className="text-xs">Kraunama...</span>
                </div>
             </div>
          ) : currentWeek ? (
            <>
              {/* Stats & Actions */}
              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <MusicNote className="w-4 h-4" />
                  <span>Dainos: {currentWeek.track_count}</span>
                </div>

                {currentWeek.spotify_url && (
                  <a 
                    href={currentWeek.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 hover:bg-[#1DB954]/10 hover:border-[#1DB954]/30 hover:text-[#1DB954] text-zinc-400 text-xs font-medium transition-all group"
                  >
                    <SpotifyLogo weight="fill" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Spotify
                  </a>
                )}
              </div>

              {/* Track List */}
              <div className="space-y-2">
                {loadingTracks ? (
                  // Skeleton Loading
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 w-full bg-zinc-900/30 rounded-md animate-pulse border border-zinc-800/50" />
                  ))
                ) : tracks.length > 0 ? (
                  <div className="grid gap-2">
                    {tracks.map((track) => (
                      <TrackItem 
                        key={track.id} 
                        track={track} 
                        isActive={playingTrackId === track.id}
                        onPlay={() => setPlayingTrackId(track.id)}
                        onStop={() => setPlayingTrackId(null)}
                        onColorChange={setBgGradient}
                        isHighlighted={highlightedTrackId === track.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-600 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
                    <Disc3 className="w-10 h-10 mb-3 opacity-20" />
                    <p>Šiai savaitei dainų nėra.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500">
              Nepasirinkta jokia savaitė.
            </div>
          )}
        </main>

        <footer className="mt-20 text-center text-xs text-zinc-800 pb-4">
          <p>&copy; {new Date().getFullYear()} DJ Destiny</p>
        </footer>
      </div>
    </div>
  );
};

export default App;