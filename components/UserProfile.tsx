import React, { useMemo } from 'react';
import { Track, Week } from '../types';
import { ArrowLeft, Sparkles, BrainCircuit, BarChart3 } from 'lucide-react';
import { ProfileHeader } from './profile/ProfileHeader';
import { StatsGrid } from './profile/StatsGrid';
import { HistoryList } from './profile/HistoryList';
import { useUserStats } from '../hooks/useUserStats';

// Charts
import { VibeRadar } from './profile/charts/VibeRadar';
import { TrendChart } from './profile/charts/TrendChart';
import { TrophyChart } from './profile/charts/TrophyChart';

interface UserProfileProps {
  username: string;
  tracks: Track[]; // All tracks in DB belonging to this user
  weeks: Week[];
  onBack: () => void;
  onTrackClick: (weekId: string, trackId: string) => void;
  isLoading?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ username, tracks, weeks, onBack, onTrackClick, isLoading }) => {
  
  // AI Stats Hook
  const { stats: aiStats, isAnalyzing } = useUserStats(username, tracks);

  // Calculate Standard Stats
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

      {/* AI Persona Card + Radar */}
      {!isLoading && tracks.length >= 5 && (
        <div className="mb-8 p-6 rounded-2xl bg-zinc-900/40 border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 blur-xl pointer-events-none" />
          
          {isAnalyzing ? (
             <div className="flex items-center justify-center gap-3 text-emerald-400 py-12">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
                <span className="text-sm font-medium animate-pulse">AI analizuoja muzikinį skonį...</span>
             </div>
          ) : aiStats ? (
             <div className="relative z-10 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                   
                   {/* Left: Text Info */}
                   <div className="flex-1 space-y-4 w-full text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-1">
                         <Sparkles className="w-4 h-4" />
                         <span className="text-xs font-bold uppercase tracking-widest">AI Muzikinis Profilis</span>
                      </div>
                      
                      <div>
                        <h3 className="text-3xl font-black text-white mb-2">{aiStats.dj_name}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed italic border-l-0 md:border-l-2 border-emerald-500/30 md:pl-4">
                          "{aiStats.bio}"
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                        {aiStats.vibe_keywords.map(k => (
                          <span key={k} className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            #{k}
                          </span>
                        ))}
                      </div>
                   </div>
                   
                   {/* Right: Radar Chart */}
                   <div className="w-full max-w-[280px] shrink-0">
                      <VibeRadar scores={aiStats.vibe_scores} />
                   </div>

                </div>
             </div>
          ) : null}
        </div>
      )}

      {/* Main Stats (Medals) */}
      <StatsGrid stats={stats} />

      {/* Analytics Charts Section */}
      {!isLoading && tracks.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
           <TrendChart tracks={tracks} weeks={weeks} />
           <TrophyChart stats={stats} />
        </div>
      )}

      {/* History List */}
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
