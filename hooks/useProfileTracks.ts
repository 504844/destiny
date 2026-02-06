import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { getAllAliases } from '../lib/aliases';

export const useProfileTracks = (username: string | null) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      if (!username) return [];

      const aliases = getAllAliases(username);

      // STRATEGY 1: Try the Fast RPC (Postgres Function)
      // This assumes the user has run the SQL setup.
      try {
        const { data, error } = await supabase.rpc('get_user_tracks', { aliases });
        
        if (!error) {
          return data as Track[];
        }
        
        // If error is "function not found", we silently fall back to Strategy 2
        console.warn("RPC Optimization failed (function likely missing), falling back to standard query.", error.message);
      } catch (e) {
        // Ignore and fallback
      }

      // STRATEGY 2: Standard Query (Slower, client-side construction)
      // Fallback for when the SQL function hasn't been created yet.
      const filterQuery = aliases.map(alias => `submitted_by.ilike.${alias}`).join(',');
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('tracks')
        .select('*')
        .or(filterQuery)
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return fallbackData as Track[];
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 2, // Profile data is fairly static
  });
};