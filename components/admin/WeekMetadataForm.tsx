import React from 'react';

interface WeekMetadataFormProps {
  weekNumber: number;
  setWeekNumber: (val: number) => void;
  dateRange: string;
  setDateRange: (val: string) => void;
  spotifyUrl: string;
  setSpotifyUrl: (val: string) => void;
}

export const WeekMetadataForm: React.FC<WeekMetadataFormProps> = ({
  weekNumber, setWeekNumber,
  dateRange, setDateRange,
  spotifyUrl, setSpotifyUrl
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Savaitės Nr.</label>
          <input
            type="number"
            value={weekNumber || ''}
            onChange={(e) => setWeekNumber(parseInt(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
            placeholder="pvz. 19"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Data (Range)</label>
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
            placeholder="pvz. Gegužės 12 - 19"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Spotify URL</label>
        <input
          type="text"
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 text-sm"
        />
      </div>
    </div>
  );
};