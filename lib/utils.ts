import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateId = () => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getMedalColor = (medal: string | null) => {
  switch (medal) {
    case 'gold':
      return 'text-yellow-500';
    case 'silver':
      return 'text-slate-400';
    case 'bronze':
      return 'text-amber-600';
    default:
      return 'text-zinc-500';
  }
};

export const getRowStyle = (medal: string | null) => {
  // Removed colorful backgrounds. Using subtle borders or simpler indicators.
  switch (medal) {
    case 'gold':
      return 'border-l-2 border-l-yellow-500';
    case 'silver':
      return 'border-l-2 border-l-slate-400';
    case 'bronze':
      return 'border-l-2 border-l-amber-600';
    default:
      return 'border-l-2 border-l-transparent hover:bg-white/[0.02]';
  }
};