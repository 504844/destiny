import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Track } from './types';
import { AdminBar } from './components/admin/AdminBar';
import { LoginModal } from './components/LoginModal';
import { CommandSearch } from './components/CommandSearch';
import { UserProfile } from './components/UserProfile';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { BackgroundEffects } from './components/layout/BackgroundEffects';
import { HomeView } from './components/views/HomeView';
import { useMusicData } from './hooks/useMusicData';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAdmin } from './hooks/useAdmin';
import { getAllAliases } from './lib/aliases';

type ViewMode = 'HOME' | 'PROFILE';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [bgGradient, setBgGradient] = useState<string | null>(null);
  
  // Custom Hooks
  const { 
    weeks, selectedWeekId, setSelectedWeekId, 
    tracks, loadingWeeks, loadingTracks, 
    fetchWeeks, fetchTracks 
  } = useMusicData();
  
  const { playingTrackId, playTrack, stopTrack } = useAudioPlayer();
  
  const { 
    isAdmin, showLoginModal, isConsoleOpen, 
    handleLogoClick, login, closeLoginModal, toggleConsole, closeConsole 
  } = useAdmin();

  // Search & Highlight state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  
  // Profile State
  const [selectedProfileUser, setSelectedProfileUser] = useState<string | null>(null);
  const [profileTracks, setProfileTracks] = useState<Track[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // --- Profile Logic ---
  const handleOpenProfile = async (username: string) => {
    setIsLoadingProfile(true);
    setSelectedProfileUser(username);
    setViewMode('PROFILE');
    stopTrack(); // Stop playback
    setBgGradient(null);
    setProfileTracks([]); // Clear previous tracks
    
    try {
      const aliases = getAllAliases(username);
      const filterQuery = aliases.map(alias => `submitted_by.ilike.${alias}`).join(',');

      const { data } = await supabase
          .from('tracks')
          .select('*')
          .or(filterQuery);

      if (data) {
          setProfileTracks(data as Track[]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleBackToHome = () => {
    setViewMode('HOME');
    setSelectedProfileUser(null);
    setProfileTracks([]);
    if (selectedWeekId) {
        fetchTracks(selectedWeekId);
    }
  };

  // --- Search & Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchResult = (weekId: string, trackId: string) => {
    setIsSearchOpen(false);
    
    if (viewMode === 'PROFILE') {
        setViewMode('HOME');
    }

    if (selectedWeekId !== weekId) {
      setSelectedWeekId(weekId);
    }
    setHighlightedTrackId(trackId);
    setTimeout(() => {
      setHighlightedTrackId(null);
    }, 3000);
  };

  useEffect(() => {
    if (selectedWeekId && viewMode === 'HOME') {
      fetchTracks(selectedWeekId);
    }
  }, [selectedWeekId, viewMode]);

  const currentWeek = weeks.find(w => w.id === selectedWeekId);

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans overflow-x-hidden relative transition-colors duration-1000">
      
      {/* Global Modals */}
      <CommandSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
        weeks={weeks}
        onSelectResult={handleSearchResult}
        onSelectUser={handleOpenProfile}
      />

      {showLoginModal && (
        <LoginModal 
          onClose={closeLoginModal}
          onLogin={login}
        />
      )}

      {/* Headless Admin Console */}
      {isAdmin && isConsoleOpen && (
        <AdminBar 
          weeks={weeks}
          onClose={closeConsole}
          onSuccess={(weekId) => fetchWeeks(weekId)}
        />
      )}

      {/* Layout Components */}
      <BackgroundEffects color={bgGradient} />
      
      <Navbar 
        onLogoClick={handleLogoClick} 
        onSearchClick={() => setIsSearchOpen(true)} 
      />

      {/* Main Container */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-24 pb-12 w-full">
        {viewMode === 'HOME' ? (
          <HomeView
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelectWeek={setSelectedWeekId}
            loadingWeeks={loadingWeeks}
            loadingTracks={loadingTracks}
            tracks={tracks}
            playingTrackId={playingTrackId}
            onPlayTrack={playTrack}
            onStopTrack={stopTrack}
            onColorChange={setBgGradient}
            highlightedTrackId={highlightedTrackId}
            onSearchClick={() => setIsSearchOpen(true)}
            isAdmin={isAdmin}
          />
        ) : (
          <UserProfile 
            username={selectedProfileUser || 'Vartotojas'} 
            tracks={profileTracks} 
            weeks={weeks}
            onBack={handleBackToHome}
            onTrackClick={handleSearchResult}
            isLoading={isLoadingProfile}
          />
        )}

        <Footer />
      </div>
    </div>
  );
};

export default App;