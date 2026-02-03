import { DraftTrack } from '../types';
import { generateId } from './utils';

// Extended DraftTrack with unique ID for React rendering
export interface DraftTrackWithId extends DraftTrack {
  _id: string; // Temporary ID for React keys
}

export interface ParsedDiscordData {
  weekNumber: number;
  spotifyUrl: string;
  tracks: DraftTrackWithId[];
}

export const parseDiscordDump = (text: string, currentPositionStart: number = 1): ParsedDiscordData => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const tracks: DraftTrackWithId[] = [];
  let detectedWeekNum = 0;
  let detectedSpotifyUrl = '';
  let currentPosition = currentPositionStart;

  lines.forEach(line => {
    // 1. Detect Week Number in Header
    if (line.toLowerCase().includes('savaitės')) {
      const match = line.match(/(\d+)-osios/);
      if (match) detectedWeekNum = parseInt(match[1]);
      return; 
    }

    // 2. Detect Spotify URL
    if (line.includes('open.spotify.com')) {
      detectedSpotifyUrl = line;
      return; 
    }

    // 3. Skip header filler text
    if (line.toLowerCase().includes('labas vakaras') || line.toLowerCase().includes('nuoroda į')) {
      return;
    }

    // 4. Parse Track Line
    const separatorRegex = /\s[–-]\s/;
    if (!separatorRegex.test(line)) return;

    const parts = line.split(separatorRegex);
    const artistRaw = parts[0].trim();
    let restOfLine = parts.slice(1).join(' - ').trim(); 

    // A. Extract Medal / Position
    let medal: 'gold' | 'silver' | 'bronze' | null = null;
    let position = currentPosition;

    if (restOfLine.includes('🥇')) {
      medal = 'gold';
      position = 1;
      restOfLine = restOfLine.replace('🥇', '');
    } else if (restOfLine.includes('🥈')) {
      medal = 'silver';
      position = 2;
      restOfLine = restOfLine.replace('🥈', '');
    } else if (restOfLine.includes('🥉')) {
      medal = 'bronze';
      position = 3;
      restOfLine = restOfLine.replace('🥉', '');
    } else {
      if (currentPosition < 4) currentPosition = 4;
      position = currentPosition;
    }

    // B. Extract Submitter
    let submittedBy = null;
    // Updated Regex: allow dots (.) and dashes (-) in usernames to handle "@S.H exe" correctly
    const submitterRegex = /(@[\w\p{L}\d_\s\.\-]+)|(\[[\w\p{L}\d_\s\.\-]+\])$/u;
    const submitterMatch = restOfLine.match(submitterRegex);

    if (submitterMatch) {
      const rawSubmitter = submitterMatch[0];
      restOfLine = restOfLine.replace(rawSubmitter, '');
      submittedBy = rawSubmitter.replace(/^@/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
    }

    // C. Final Title Cleanup
    const titleClean = restOfLine.trim();

    if (titleClean && artistRaw) {
      tracks.push({
        _id: generateId(),
        artists: artistRaw,
        title: titleClean,
        submitted_by: submittedBy,
        position: position,
        medal: medal
      });
      currentPosition++; 
    }
  });

  // Ensure parsing sorts by position roughly if implicit
  // However, usually we want to preserve input order unless medals dictate otherwise
  // But strictly speaking, the caller might want to sort.
  // We will leave the array in order of parsing, but update position numbers if needed.

  return {
    weekNumber: detectedWeekNum,
    spotifyUrl: detectedSpotifyUrl,
    tracks
  };
};