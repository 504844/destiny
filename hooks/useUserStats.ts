import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Track, UserStats } from '../types';
import { analyzeUserTaste } from '../services/ai';

export const useUserStats = (username: string, tracks: Track[]) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrGenerateStats = async () => {
      if (!username || tracks.length < 5) return; // Need at least 5 tracks for meaningful analysis

      setIsAnalyzing(true);
      setError(null);

      try {
        // 1. Check Supabase Cache
        const { data: existingData, error: dbError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('username', username)
          .single();

        // Check if data is fresh (less than 7 days old)
        // If user has new tracks since last update, we might want to force update, but keeping it simple for now.
        const isFresh = existingData && 
          (new Date().getTime() - new Date(existingData.last_updated).getTime()) < (7 * 24 * 60 * 60 * 1000);

        if (isFresh) {
          if (isMounted) {
             setStats(existingData as UserStats);
             setIsAnalyzing(false);
          }
          return;
        }

        // 2. If missing or stale, Generate with AI
        const analysis = await analyzeUserTaste(username, tracks);

        if (analysis) {
          const newStats: UserStats = {
            username,
            dj_name: analysis.djName,
            bio: analysis.bio,
            vibe_keywords: analysis.vibeKeywords,
            vibe_scores: analysis.vibeScores,
            last_updated: new Date().toISOString()
          };

          // 3. Upsert into Supabase
          const { error: upsertError } = await supabase
            .from('user_stats')
            .upsert(newStats);
          
          if (upsertError) {
             console.warn("Failed to cache stats:", upsertError);
          }

          if (isMounted) setStats(newStats);
        }

      } catch (err: any) {
        console.error("Stats Hook Error:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsAnalyzing(false);
      }
    };

    fetchOrGenerateStats();

    return () => { isMounted = false; };
  }, [username, tracks.length]); // Re-run if tracks count changes significantly? For now just on mount/user change.

  return { stats, isAnalyzing, error };
};
