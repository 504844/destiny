import React, { useMemo } from 'react';
import { Track, Week } from '../types';
import { ArrowLeft } from 'lucide-react';
import { ProfileHeader } from './profile/ProfileHeader';
import { StatsGrid } from './profile/StatsGrid';
import { HistoryList } from './profile/HistoryList';

interface UserProfileProps {
  username: string;
  tracks: Track[]; // All tracks in DB belonging to this user
  weeks: Week[];
  onBack: () => void;
  onTrackClick: (weekId: string, trackId: string) => void;
  isLoading?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ username, tracks, weeks, onBack, onTrackClick, isLoading }) => {
  // Calculate Stats
  const stats = useMemo(() => {
    const total = tracks.length;
    const gold = tracks.filter(t => t.medal === 'gold').length;
    const silver = tracks.filter(t => t.medal === 'silver').length;
    const bronze = tracks.filter(t => t.medal === 'bronze').length;
    
    // Calculate average position
    const avgPos = total > 0 
      ? (tracks.reduce((acc, curr) => acc + curr.position, 0) / total).toFixed(1)
      : '0.0';

    return { total, gold, silver, bronze, avgPos };
  }, [tracks]);

  // Sort tracks by date (newest first)
  const sortedTracks = [...tracks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
      >
        <div className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
           <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Grįžti į Topus</span>
      </button>

      <ProfileHeader 
        username={username} 
        totalTracks={isLoading ? 0 : stats.total} 
        avgPos={isLoading ? '-' : stats.avgPos} 
      />

      <StatsGrid stats={stats} />

      <HistoryList 
        tracks={sortedTracks} 
        weeks={weeks}
        onTrackClick={onTrackClick} 
        isLoading={isLoading}
      />

      <div className="mt-12 mb-8 text-center">
        <p className="text-xs text-zinc-700">
          {isLoading ? 'Kraunama...' : `Rodomos visos ${stats.total} dainos`}
        </p>
      </div>

    </div>
  );
};
