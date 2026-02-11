import React from 'react';
import { Week, Track } from '../../types';
import { HomeControls } from '../home/HomeControls';
import { TrackList } from '../home/TrackList';

interface HomeViewProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  loadingWeeks: boolean;
  loadingTracks: boolean;
  tracks: Track[];
  playingTrackId: string | null;
  onPlayTrack: (id: string) => void;
  onStopTrack: () => void;
  onColorChange: (color: string | null) => void;
  highlightedTrackId: string | null;
  onSearchClick: () => void;
  isAdmin: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  weeks,
  selectedWeekId,
  onSelectWeek,
  loadingWeeks,
  loadingTracks,
  tracks,
  playingTrackId,
  onPlayTrack,
  onStopTrack,
  onColorChange,
  highlightedTrackId,
  onSearchClick,
  isAdmin,
}) => {
  const currentWeek = weeks.find(w => w.id === selectedWeekId);

  return (
    <>
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 inline-block">
              Savaitės top 
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Jūsų grotų dainų topai</p>
      </div>

      <main className="space-y-6">
          <HomeControls 
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelectWeek={onSelectWeek}
            loadingWeeks={loadingWeeks}
            onSearchClick={onSearchClick}
            isAdmin={isAdmin}
            currentWeek={currentWeek}
          />

          {loadingWeeks ? (
               <div className="flex items-center justify-center h-48 text-zinc-600">
                   <div className="flex flex-col items-center gap-2">
                       <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                       <span className="text-xs">Kraunama...</span>
                   </div>
               </div>
          ) : currentWeek ? (
              <TrackList 
                currentWeek={currentWeek}
                tracks={tracks}
                loadingTracks={loadingTracks}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
                onStopTrack={onStopTrack}
                onColorChange={onColorChange}
                highlightedTrackId={highlightedTrackId}
              />
          ) : (
              <div className="flex items-center justify-center h-48 text-zinc-500">
                  Nepasirinkta jokia savaitė.
              </div>
          )}
      </main>
    </>
  );
};