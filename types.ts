export interface Week {
  id: string;
  week_number: number;
  date_range: string;
  spotify_url: string | null;
  track_count: number;
  created_at: string;
}

export interface Track {
  id: string;
  week_id: string;
  title: string;
  artists: string;
  submitted_by: string | null;
  position: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  artwork_url?: string | null;
  preview_url?: string | null;
  created_at: string;
}

export interface DraftTrack {
  title: string;
  artists: string;
  submitted_by: string | null;
  position: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

export interface UserStats {
  username: string;
  dj_name: string;
  bio: string;
  vibe_keywords: string[];
  vibe_scores: {
    energy: number;     // 0-100 (Chill -> Banger)
    mood: number;       // 0-100 (Dark -> Uplifting)
    popularity: number; // 0-100 (Underground -> Mainstream)
    era: number;        // 0-100 (Retro -> Modern)
    vocals: number;     // 0-100 (Instrumental -> Vocal Heavy)
  };
  last_updated: string;
}

export type MedalType = 'gold' | 'silver' | 'bronze' | null;
