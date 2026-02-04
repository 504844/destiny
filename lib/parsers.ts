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
    // Allow lines starting with numbers like "1. Artist - Title" or just "Artist - Title"
    const separatorRegex = /\s[–-]\s/;
    
    // If line starts with "1." or "01.", strip it to help parsing
    let processingLine = line.replace(/^\d+\.\s*/, '');

    if (!separatorRegex.test(processingLine)) return;

    const parts = processingLine.split(separatorRegex);
    const artistRaw = parts[0].trim();
    let restOfLine = parts.slice(1).join(' - ').trim(); 

    // A. Extract Position & Clean Emojis
    let position = currentPosition;

    // Explicit emoji overrides
    if (restOfLine.includes('🥇')) {
      position = 1;
      restOfLine = restOfLine.replace('🥇', '');
    } else if (restOfLine.includes('🥈')) {
      position = 2;
      restOfLine = restOfLine.replace('🥈', '');
    } else if (restOfLine.includes('🥉')) {
      position = 3;
      restOfLine = restOfLine.replace('🥉', '');
    }
    
    // B. Assign Medal based on Position (Automatic sync)
    let medal: 'gold' | 'silver' | 'bronze' | null = null;
    if (position === 1) medal = 'gold';
    else if (position === 2) medal = 'silver';
    else if (position === 3) medal = 'bronze';

    // C. Extract Submitter
    let submittedBy = null;
    // Regex: allow dots (.) and dashes (-) in usernames to handle "@S.H exe" correctly
    const submitterRegex = /(@[\w\p{L}\d_\s\.\-]+)|(\[[\w\p{L}\d_\s\.\-]+\])$/u;
    const submitterMatch = restOfLine.match(submitterRegex);

    if (submitterMatch) {
      const rawSubmitter = submitterMatch[0];
      restOfLine = restOfLine.replace(rawSubmitter, '');
      submittedBy = rawSubmitter.replace(/^@/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
    }

    // D. Final Title Cleanup
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
      // Increment for next loop
      currentPosition++; 
    }
  });

  return {
    weekNumber: detectedWeekNum,
    spotifyUrl: detectedSpotifyUrl,
    tracks
  };
};