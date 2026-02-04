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

export const getRankBadgeStyle = (medal: string | null) => {
  switch (medal) {
      case 'gold':
          return 'bg-yellow-500/20 text-yellow-500 ring-1 ring-yellow-500/50 backdrop-blur-md';
      case 'silver':
          return 'bg-slate-400/20 text-slate-400 ring-1 ring-slate-400/50 backdrop-blur-md';
      case 'bronze':
          return 'bg-amber-600/20 text-amber-600 ring-1 ring-amber-600/50 backdrop-blur-md';
      default:
          return 'bg-zinc-950/80 border border-zinc-800 text-zinc-500 backdrop-blur-md';
  }
};

// Helper to translate English months to Lithuanian (Genitive case for dates)
export const formatLithuanianDate = (dateString: string | null | undefined) => {
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