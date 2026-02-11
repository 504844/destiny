import React from 'react';
import { WeekSelector } from '../WeekSelector';
import { Week } from '../../types';

interface HomeControlsProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  loadingWeeks: boolean;
  onSearchClick: () => void;
  isAdmin: boolean;
  currentWeek?: Week;
}

export const HomeControls: React.FC<HomeControlsProps> = ({
  weeks,
  selectedWeekId,
  onSelectWeek,
  loadingWeeks,
}) => {
  return (
    <div className="sticky top-24 z-40 flex justify-center pointer-events-none mb-8">
      <div className="pointer-events-auto">
        <WeekSelector 
          weeks={weeks} 
          selectedWeekId={selectedWeekId} 
          onSelectWeek={onSelectWeek}
          isLoading={loadingWeeks}
        />
      </div>
    </div>
  );
};