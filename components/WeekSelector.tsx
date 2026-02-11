import React, { useState, useRef, useEffect } from 'react';
import { Week } from '../types';
import { cn, formatLithuanianDate } from '../lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface WeekSelectorProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  isLoading: boolean;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({ weeks, selectedWeekId, onSelectWeek, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIndex = weeks.findIndex(w => w.id === selectedWeekId);
  const selectedWeek = weeks[currentIndex];

  const hasNewer = currentIndex > 0;
  const hasOlder = currentIndex !== -1 && currentIndex < weeks.length - 1;

  const handleOlder = () => {
    if (hasOlder) onSelectWeek(weeks[currentIndex + 1].id);
  };

  const handleNewer = () => {
    if (hasNewer) onSelectWeek(weeks[currentIndex - 1].id);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="h-14 w-full max-w-sm mx-auto bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800" />;
  }

  if (weeks.length === 0) return null;

  return (
    <div className="relative w-full max-w-sm mx-auto z-50 select-none" ref={dropdownRef}>
      
      {/* Unified Control Pill */}
      <div className={cn(
        "flex items-center p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-colors duration-300",
        isOpen 
          ? "bg-zinc-900 border-zinc-700 shadow-black/60" 
          : "bg-zinc-950/80 border-zinc-800 shadow-black/40 hover:border-zinc-700/50"
      )}>
        
        {/* Left Arrow (Older) */}
        <button 
            onClick={handleOlder}
            disabled={!hasOlder}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all shrink-0 active:scale-95"
            title="Ankstesnė savaitė"
        >
            <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-800 mx-1" />

        {/* Center Trigger */}
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 flex flex-col items-center justify-center py-1 px-2 group cursor-pointer"
        >
             <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {selectedWeek ? formatLithuanianDate(selectedWeek.date_range) : 'Pasirinkti'}
             </span>
             <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                  {selectedWeek ? `Savaitė ${selectedWeek.week_number}` : 'Savaitės Topai'}
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-600 transition-transform duration-300", isOpen && "rotate-180 text-zinc-400")} />
             </div>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-800 mx-1" />

        {/* Right Arrow (Newer) */}
        <button 
            onClick={handleNewer}
            disabled={!hasNewer}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:hover:bg-transparent transition-all shrink-0 active:scale-95"
            title="Naujesnė savaitė"
        >
            <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dropdown Menu */}
      <div className={cn(
          "absolute top-full left-0 right-0 mt-3 p-2 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl origin-top transition-all duration-200 z-[60] ring-1 ring-white/5",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0 visible" 
            : "opacity-0 scale-95 -translate-y-2 invisible pointer-events-none"
      )}>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar pr-1 space-y-1">
              {weeks.map((week) => {
                  const isSelected = selectedWeekId === week.id;
                  return (
                      <button
                          key={week.id}
                          onClick={() => {
                              onSelectWeek(week.id);
                              setIsOpen(false);
                          }}
                          className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200 group",
                              isSelected 
                                  ? "bg-white/10 text-white shadow-inner" 
                                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                          )}
                      >
                          {/* Week Number Badge */}
                          <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors shrink-0 font-mono",
                              isSelected 
                                  ? "bg-zinc-950 border-transparent text-white shadow-lg" 
                                  : "bg-zinc-900/50 border-zinc-800 text-zinc-500 group-hover:border-zinc-700"
                          )}>
                              <span className="opacity-40 text-xs mr-0.5">#</span>{week.week_number}
                          </div>

                          {/* Text Info */}
                          <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                              <span className={cn("text-xs font-bold uppercase tracking-wide truncate", isSelected ? "text-white" : "text-zinc-300")}>
                                  {formatLithuanianDate(week.date_range)}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                  <span>{week.track_count} dainos</span>
                              </div>
                          </div>

                          {/* Selected Checkmark */}
                          {isSelected && <Check className="w-4 h-4 text-white mr-2" />}
                      </button>
                  );
              })}
          </div>
          
          {/* Scroll Indicator Gradient (Bottom) */}
          <div className="absolute bottom-2 left-2 right-4 h-4 bg-gradient-to-t from-zinc-950/90 to-transparent pointer-events-none rounded-b-xl" />
      </div>
    </div>
  );
};