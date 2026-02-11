import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Week, Track } from '../types';

export const useMusicData = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  
  // Cache to store loaded tracks for instant switching
  const trackCache = useRef<Record<string, Track[]>>({});

  const fetchWeeks = async (keepSelection?: string) => {
    setLoadingWeeks(true);
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false });

    if (error) {
      console.error('Error fetching weeks:', error);
    } else if (data) {
      setWeeks(data);
      
      if (keepSelection) {
        if (keepSelection === selectedWeekId) {
            // Force refresh if requested
            fetchTracks(keepSelection);
        } else {
            setSelectedWeekId(keepSelection);
        }
      } else if (!selectedWeekId && data.length > 0) {
          const storedWeekId = localStorage.getItem('dj_destiny_selected_week');
          const weekExists = storedWeekId && data.some(w => w.id === storedWeekId);
          setSelectedWeekId(weekExists ? storedWeekId : data[0].id);
      } else if (selectedWeekId && !data.some(w => w.id === selectedWeekId)) {
          setSelectedWeekId(data[0].id);
      }
    }
    setLoadingWeeks(false);
  };

  const prefetchWeek = async (weekId: string) => {
    if (trackCache.current[weekId]) return;

    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('week_id', weekId)
      .order('position', { ascending: true });

    if (data) {
        trackCache.current[weekId] = data as Track[];
    }
  };

  const triggerPrefetch = (currentWeekId: string) => {
      const currentIndex = weeks.findIndex(w => w.id === currentWeekId);
      if (currentIndex === -1) return;
      
      // 1. Prefetch Older Week (Next in list, e.g. Week 19 -> Week 18)
      if (currentIndex < weeks.length - 1) {
          const olderWeek = weeks[currentIndex + 1];
          // Short delay to prioritize current render
          setTimeout(() => prefetchWeek(olderWeek.id), 200);
      }

      // 2. Prefetch Newer Week (Previous in list, e.g. Week 19 -> Week 20)
      if (currentIndex > 0) {
          const newerWeek = weeks[currentIndex - 1];
          // Slightly longer delay to stagger network requests
          setTimeout(() => prefetchWeek(newerWeek.id), 600);
      }
  };

  const fetchTracks = async (weekId: string) => {
    // 1. Check Cache first for instant load
    if (trackCache.current[weekId]) {
      setTracks(trackCache.current[weekId]);
      setLoadingTracks(false);
      triggerPrefetch(weekId);
      return;
    }

    // 2. Fetch from network
    setLoadingTracks(true);
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('week_id', weekId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
    } else if (data) {
      const typedTracks = data as Track[];
      trackCache.current[weekId] = typedTracks;
      setTracks(typedTracks);
      
      triggerPrefetch(weekId);
    }
    setLoadingTracks(false);
  };

  // Initial Fetch
  useEffect(() => {
    fetchWeeks();
  }, []);

  // Persist selection
  useEffect(() => {
    if (selectedWeekId) {
      localStorage.setItem('dj_destiny_selected_week', selectedWeekId);
    }
  }, [selectedWeekId]);

  return {
    weeks,
    selectedWeekId,
    setSelectedWeekId,
    tracks,
    setTracks,
    loadingWeeks,
    loadingTracks,
    fetchWeeks,
    fetchTracks
  };
};