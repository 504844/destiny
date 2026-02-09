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
  genre?: string | null;
  created_at: string;
}

export interface DraftTrack {
  title: string;
  artists: string;
  submitted_by: string | null;
  position: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

export type MedalType = 'gold' | 'silver' | 'bronze' | null;