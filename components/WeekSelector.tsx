import React, { useState, useRef, useEffect } from 'react';
import { Week } from '../types';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface WeekSelectorProps {
  weeks: Week[];
  selectedWeekId: string | null;
  onSelectWeek: (id: string) => void;
  isLoading: boolean;
}

// Helper to translate English months to Lithuanian (Genitive case for dates)
const formatLithuanianDate = (dateString: string | null) => {
  if (!dateString) return '';
  
  const months: Record<string, string> = {
    'January': 'Sausio',
    'February': 'Vasario',
    'March': 'Kovo',
    'April': 'Balandžio',
    'May': 'Gegužės',
    'June': 'Birželio',
    'July': 'Liepos',
    'August': 'Rugpjūčio',
    'September': 'Rugsėjo',
    'October': 'Spalio',
    'November': 'Lapkričio',
    'December': 'Gruodžio',
    // Handle potential short forms
    'Jan': 'Saus.',
    'Feb': 'Vas.',
    'Mar': 'Kov.',
    'Apr': 'Bal.',
    'Jun': 'Birž.',
    'Jul': 'Liep.',
    'Aug': 'Rugpj.',
    'Sep': 'Rugs.',
    'Oct': 'Spal.',
    'Nov': 'Lapkr.',
    'Dec': 'Gruodž.'
  };

  let result = dateString;
  Object.keys(months).forEach(eng => {
     // Use word boundary to avoid partial replacements (though unlikely for months)
     const regex = new RegExp(`\\b${eng}\\b`, 'gi');
     result = result.replace(regex, months[eng]);
  });
  return result;
};

export const WeekSelector: React.FC<WeekSelectorProps> = ({ weeks, selectedWeekId, onSelectWeek, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || weeks.length === 0) {
    return (
      <div className="h-10 w-48 mx-auto bg-zinc-900/50 rounded-full animate-pulse border border-zinc-800" />
    );
  }

  const currentIndex = weeks.findIndex(w => w.id === selectedWeekId);
  const currentWeek = weeks[currentIndex];
  
  const handlePrev = () => {
    if (currentIndex < weeks.length - 1) {
      onSelectWeek(weeks[currentIndex + 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onSelectWeek(weeks[currentIndex - 1].id);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 p-1 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/60 rounded-full shadow-2xl ring-1 ring-white/5" ref={dropdownRef}>
      
      {/* Previous Button - Circle */}
      <button 
        onClick={handlePrev}
        disabled={currentIndex >= weeks.length - 1}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Ankstesnė savaitė"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Center Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center justify-center px-4 py-0.5 group cursor-pointer"
      >
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-0.5">{currentWeek?.week_number} Savaitė</span>
        <div className="flex items-center gap-1.5 text-zinc-200 group-hover:text-white transition-colors">
          <span className="text-sm font-semibold whitespace-nowrap">{formatLithuanianDate(currentWeek?.date_range)}</span>
          <ChevronDown className={cn("w-3 h-3 text-zinc-500 transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Next Button - Circle */}
      <button 
        onClick={handleNext}
        disabled={currentIndex <= 0}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Sekanti savaitė"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 p-1.5 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
          {weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => {
                onSelectWeek(week.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all mb-0.5 group",
                selectedWeekId === week.id 
                  ? "bg-zinc-800/80 text-white" 
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-5 text-center font-mono text-[10px] font-medium border rounded px-0.5 py-px shrink-0", 
                  selectedWeekId === week.id 
                    ? "border-zinc-600 text-zinc-300" 
                    : "border-zinc-800 text-zinc-600 group-hover:border-zinc-700"
                )}>
                  {week.week_number}
                </span>
                <span className="font-medium truncate">{formatLithuanianDate(week.date_range)}</span>
              </div>
              {selectedWeekId === week.id && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};