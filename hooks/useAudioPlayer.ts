import { useState } from 'react';

export const useAudioPlayer = () => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const playTrack = (trackId: string) => {
    setPlayingTrackId(trackId);
  };

  const stopTrack = () => {
    setPlayingTrackId(null);
  };

  return {
    playingTrackId,
    setPlayingTrackId, // Exposed for manual resets if needed
    playTrack,
    stopTrack
  };
};