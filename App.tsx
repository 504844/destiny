import React, { useEffect, useState } from 'react';
import { Track } from './types';
import { AdminPanel } from './components/AdminPanel';
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
import { useProfileTracks } from './hooks/useProfileTracks';

type ViewMode = 'HOME' | 'PROFILE';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [bgGradient, setBgGradient] = useState<string | null>(null);
  
  // Custom Hooks (Data)
  const { 
    weeks, selectedWeekId, setSelectedWeekId, 
    tracks, loadingWeeks, loadingTracks, 
    fetchWeeks, fetchTracks 
  } = useMusicData();
  
  const { playingTrackId, playTrack, stopTrack } = useAudioPlayer();
  
  const { 
    isAdmin, showLoginModal, adminPanelMode, setAdminPanelMode, 
    handleLogoClick, login, closeLoginModal, closeAdminPanel 
  } = useAdmin();

  // Search & Highlight state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  
  // Profile State
  const [selectedProfileUser, setSelectedProfileUser] = useState<string | null>(null);
  
  // Fetch profile tracks automatically when username is selected using React Query
  const { data: profileTracks, isLoading: loadingProfile } = useProfileTracks(selectedProfileUser);

  // --- Profile Logic ---
  const handleOpenProfile = (username: string) => {
    setSelectedProfileUser(username);
    setViewMode('PROFILE');
    stopTrack(); // Stop playback
    setBgGradient(null);
  };

  const handleBackToHome = () => {
    setViewMode('HOME');
    setSelectedProfileUser(null);
    // React Query handles cache, so tracks for selectedWeekId are already there instantly
  };

  // --- Search & Shortcuts ---
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

  const handleSearchResult = (weekId: string, trackId: string) => {
    setIsSearchOpen(false);
    
    // If we are in profile mode, switch back to home
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

      {adminPanelMode && (
        <AdminPanel 
          onClose={closeAdminPanel} 
          initialData={adminPanelMode === 'edit' && currentWeek ? {
            weekId: currentWeek.id,
            weekNumber: currentWeek.week_number,
            dateRange: currentWeek.date_range,
            spotifyUrl: currentWeek.spotify_url || '',
            tracks: tracks
          } : null}
          onSuccess={(weekId) => {
            fetchWeeks(); 
            fetchTracks(weekId);
          }} 
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
            onEditWeek={() => setAdminPanelMode('edit')}
          />
        ) : (
          <UserProfile 
            username={selectedProfileUser || 'Vartotojas'} 
            tracks={profileTracks || []} 
            weeks={weeks}
            onBack={handleBackToHome}
            onTrackClick={handleSearchResult}
          />
        )}

        <Footer />
      </div>
    </div>
  );
};

export default App;