import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Track, Week } from '../types';
import { SearchInput } from './search/SearchInput';
import { RecentSearches } from './search/RecentSearches';
import { SearchResults } from './search/SearchResults';
import { getPrimaryUsername } from '../lib/aliases';

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: Week[];
  onSelectResult: (weekId: string, trackId: string) => void;
  onSelectUser: (username: string) => void;
}

type SearchResultItem = 
  | { type: 'track'; data: Track }
  | { type: 'user'; username: string; count: number };

export const CommandSearch: React.FC<CommandSearchProps> = ({ isOpen, onClose, weeks, onSelectResult, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);

  // Load Recents on Mount
  useEffect(() => {
    const stored = localStorage.getItem('dj_destiny_recent_users');
    if (stored) {
      try {
        setRecentUsers(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent users", e);
      }
    }
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle keyboard interaction (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const saveRecentUser = (username: string) => {
    // Remove if exists to move to top, limit to 5
    const newRecents = [username, ...recentUsers.filter(u => u !== username)].slice(0, 5);
    setRecentUsers(newRecents);
    localStorage.setItem('dj_destiny_recent_users', JSON.stringify(newRecents));
  };

  const removeRecentUser = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    const newRecents = recentUsers.filter(u => u !== username);
    setRecentUsers(newRecents);
    localStorage.setItem('dj_destiny_recent_users', JSON.stringify(newRecents));
  };

  const handleSelectUser = (username: string) => {
    onSelectUser(username);
    saveRecentUser(username);
    onClose();
  };

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      
      try {
        // 1. Fetch Tracks matching Title OR Artist OR Submitter
        const { data: trackData, error } = await supabase
          .from('tracks')
          .select('*')
          .or(`title.ilike.%${query}%,artists.ilike.%${query}%,submitted_by.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50); // Increased limit slightly to account for aggregation

        if (trackData) {
          const finalResults: SearchResultItem[] = [];
          const tracks = trackData as Track[];

          // 2. Extract Unique Users (Using Alias System)
          const matchingUsers = new Map<string, number>();
          const lowerQuery = query.toLowerCase();

          tracks.forEach(t => {
            if (t.submitted_by) {
              // Check if the actual submitted name matches query
              // OR if the primary name matches query
              const primaryName = getPrimaryUsername(t.submitted_by);
              
              const nameMatch = t.submitted_by.toLowerCase().includes(lowerQuery);
              const primaryMatch = primaryName.toLowerCase().includes(lowerQuery);

              if (nameMatch || primaryMatch) {
                // We always aggregate count under the Primary Name
                matchingUsers.set(primaryName, (matchingUsers.get(primaryName) || 0) + 1);
              }
            }
          });

          // Add User Results (Aggregated)
          Array.from(matchingUsers.entries()).forEach(([username, count]) => {
            finalResults.push({ type: 'user', username, count });
          });

          // Add Track Results
          tracks.forEach(t => {
            // Only show tracks where title/artist matches query if query isn't just a user search
            // (Optional refinement, but currently we show all matches)
            finalResults.push({ type: 'track', data: t });
          });

          setResults(finalResults);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5 animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-300 flex flex-col max-h-[70vh]">
        
        <SearchInput 
          query={query} 
          setQuery={setQuery} 
          onClose={onClose} 
          loading={loading}
        />

        <div className="overflow-y-auto p-2 custom-scrollbar bg-black/20">
          
          {/* Recent Searches (When Query is Empty) */}
          {!query && (
            <RecentSearches 
              recentUsers={recentUsers} 
              onSelectUser={handleSelectUser} 
              onRemoveUser={removeRecentUser} 
            />
          )}

          {/* Empty State when no query and no history */}
          {!query && recentUsers.length === 0 && (
             <div className="py-20 text-center text-zinc-700 select-none pointer-events-none">
                <p className="text-sm">Įveskite bent 2 simbolius...</p>
             </div>
          )}

          {/* Results */}
          {query && (
            <SearchResults 
              results={results} 
              query={query} 
              onSelectUser={handleSelectUser} 
              onSelectResult={(weekId, trackId) => {
                onSelectResult(weekId, trackId);
                onClose();
              }}
              weeks={weeks}
            />
          )}

        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
           <div className="flex gap-4">
               <span className="flex items-center gap-1"><span className="bg-zinc-800 px-1 rounded">↵</span> pasirinkti</span>
               <span className="flex items-center gap-1"><span className="bg-zinc-800 px-1 rounded">↑↓</span> naviguoti</span>
           </div>
           <span className="font-medium text-zinc-600">Smart Search v2.1</span>
        </div>
      </div>
    </div>
  );
};