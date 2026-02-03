import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Week, Track } from '../types';

export const useMusicData = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const fetchTracks = async (weekId: string) => {
    setLoadingTracks(true);
    // Resetting tracks before fetch gives better visual feedback that data is changing
    // but keeping old tracks might be smoother. Let's clear to avoid stale data.
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('week_id', weekId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
    } else if (data) {
      setTracks(data as Track[]);
    }
    setLoadingTracks(false);
  };

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
            fetchTracks(keepSelection);
        }
        setSelectedWeekId(keepSelection);
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