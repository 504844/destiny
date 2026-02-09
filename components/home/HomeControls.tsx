import React from 'react';
import { WeekSelector } from '../WeekSelector';
import { PenLine } from 'lucide-react';
import { Week } from '../../types';

interface HomeControlsProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  loadingWeeks: boolean;
  onSearchClick: () => void;
  isAdmin: boolean;
  currentWeek?: Week;
  onEditWeek: () => void;
}

export const HomeControls: React.FC<HomeControlsProps> = ({
  weeks,
  selectedWeekId,
  onSelectWeek,
  loadingWeeks,
  isAdmin,
  currentWeek,
  onEditWeek
}) => {
  return (
    <div className="sticky top-24 z-40 flex justify-center pointer-events-none mb-8">
      <div className="pointer-events-auto flex items-center p-1.5 rounded-full bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800/80 shadow-2xl ring-1 ring-white/10">
        <WeekSelector 
          weeks={weeks} 
          selectedWeekId={selectedWeekId} 
          onSelectWeek={onSelectWeek}
          isLoading={loadingWeeks}
        />
        
        {isAdmin && currentWeek && (
          <>
            <div className="w-px h-6 bg-zinc-800 mx-1.5"></div>
            <button
              onClick={onEditWeek}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-medium border border-indigo-500/20"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redaguoti</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};