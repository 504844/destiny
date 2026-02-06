import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Week, Track } from '../types';

export const useMusicData = () => {
  const queryClient = useQueryClient();
  
  // Persist selection in localStorage but initialize from it
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(
    localStorage.getItem('dj_destiny_selected_week')
  );

  // 1. Fetch Weeks (Cached)
  const weeksQuery = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: false });

      if (error) throw error;
      return data as Week[];
    }
  });

  // 2. Fetch Tracks for Selected Week (Cached)
  const tracksQuery = useQuery({
    queryKey: ['tracks', selectedWeekId],
    queryFn: async () => {
      if (!selectedWeekId) return [];
      
      const { data, error } = await supabase
        .from('tracks')
        .select('id, week_id, title, artists, submitted_by, position, medal, artwork_url, preview_url') // Select only what we need
        .eq('week_id', selectedWeekId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Track[];
    },
    enabled: !!selectedWeekId, // Only fetch if we have a week selected
    staleTime: 1000 * 60 * 5, // Tracks don't change often, keep fresh
  });

  // Auto-select most recent week on first load if nothing selected
  useEffect(() => {
    if (weeksQuery.data && weeksQuery.data.length > 0 && !selectedWeekId) {
      const latestWeekId = weeksQuery.data[0].id;
      setSelectedWeekId(latestWeekId);
    }
  }, [weeksQuery.data, selectedWeekId]);

  // Sync selection to localStorage
  useEffect(() => {
    if (selectedWeekId) {
      localStorage.setItem('dj_destiny_selected_week', selectedWeekId);
    }
  }, [selectedWeekId]);

  // --- Actions ---

  const handleSelectWeek = (id: string) => {
    setSelectedWeekId(id);
    // Prefetching is handled by WeekSelector on hover, 
    // but we could also prefetch adjacent weeks here if we wanted deeper logic.
  };

  const refreshWeeks = () => {
    queryClient.invalidateQueries({ queryKey: ['weeks'] });
  };
  
  const refreshTracks = (weekId?: string) => {
      if (weekId) {
          queryClient.invalidateQueries({ queryKey: ['tracks', weekId] });
      } else {
          queryClient.invalidateQueries({ queryKey: ['tracks'] });
      }
  };

  return {
    weeks: weeksQuery.data || [],
    selectedWeekId,
    setSelectedWeekId: handleSelectWeek,
    tracks: tracksQuery.data || [],
    loadingWeeks: weeksQuery.isLoading,
    loadingTracks: tracksQuery.isLoading,
    fetchWeeks: refreshWeeks,
    fetchTracks: refreshTracks
  };
};