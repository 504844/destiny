import React from 'react';
import { WeekSelector } from '../WeekSelector';
import { Search, PenLine } from 'lucide-react';
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
  onSearchClick,
  isAdmin,
  currentWeek,
  onEditWeek
}) => {
  return (
    <div className="sticky top-20 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/60 shadow-2xl ring-1 ring-white/5">
        <WeekSelector 
          weeks={weeks} 
          selectedWeekId={selectedWeekId} 
          onSelectWeek={onSelectWeek}
          isLoading={loadingWeeks}
        />
        <div className="w-px h-6 bg-zinc-800 mx-0.5"></div>
        <button
          onClick={onSearchClick}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
          title="Paieška (Cmd+K)"
        >
          <Search className="w-4 h-4" />
        </button>
        {isAdmin && currentWeek && (
          <button
            onClick={onEditWeek}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all"
          >
            <PenLine className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};