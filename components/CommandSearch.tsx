import React, { useState, useEffect, useRef } from 'react';
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
  
  // Navigation State
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

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

  // Reset logic
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    } else {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Determine active item count for navigation
  const itemCount = query ? results.length : recentUsers.length;

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (itemCount || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (itemCount || 1)) % (itemCount || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query) {
          const item = results[selectedIndex];
          if (item) {
            if (item.type === 'user') handleSelectUser(item.username);
            else if (item.data) handleSelectTrack(item.data.week_id, item.data.id);
          }
        } else {
          const user = recentUsers[selectedIndex];
          if (user) handleSelectUser(user);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, itemCount, results, recentUsers, selectedIndex, query]);

  // Reset index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const saveRecentUser = (username: string) => {
    const newRecents = [username, ...recentUsers.filter(u => u !== username)].slice(0, 8); // Increased limit for grid
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

  const handleSelectTrack = (weekId: string, trackId: string) => {
    onSelectResult(weekId, trackId);
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
        const { data: trackData, error } = await supabase
          .from('tracks')
          .select('*')
          .or(`title.ilike.%${query}%,artists.ilike.%${query}%,submitted_by.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (trackData) {
          const finalResults: SearchResultItem[] = [];
          const tracks = trackData as Track[];
          const matchingUsers = new Map<string, number>();
          const lowerQuery = query.toLowerCase();

          tracks.forEach(t => {
            if (t.submitted_by) {
              const primaryName = getPrimaryUsername(t.submitted_by);
              const nameMatch = t.submitted_by.toLowerCase().includes(lowerQuery);
              const primaryMatch = primaryName.toLowerCase().includes(lowerQuery);

              if (nameMatch || primaryMatch) {
                matchingUsers.set(primaryName, (matchingUsers.get(primaryName) || 0) + 1);
              }
            }
          });

          // Order: Users first, then Tracks
          Array.from(matchingUsers.entries()).forEach(([username, count]) => {
            finalResults.push({ type: 'user', username, count });
          });

          tracks.forEach(t => {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5 animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-300 flex flex-col max-h-[75vh]">
        
        <SearchInput 
          query={query} 
          setQuery={setQuery} 
          onClose={onClose} 
          loading={loading}
        />

        <div ref={listContainerRef} className="overflow-y-auto p-4 custom-scrollbar bg-black/20 min-h-[300px]">
          
          {/* Recent Searches (When Query is Empty) */}
          {!query && (
            <RecentSearches 
              recentUsers={recentUsers} 
              onSelectUser={handleSelectUser} 
              onRemoveUser={removeRecentUser} 
              selectedIndex={selectedIndex}
            />
          )}

          {/* Empty State when no query and no history */}
          {!query && recentUsers.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-zinc-700 select-none pt-12 pb-20">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <p className="text-sm font-medium text-zinc-500">Pradėkite rašyti...</p>
                <p className="text-xs text-zinc-700 mt-1">Galite ieškoti dainų, atlikėjų arba vartotojų</p>
             </div>
          )}

          {/* Results */}
          {query && (
            <SearchResults 
              results={results} 
              query={query} 
              onSelectUser={handleSelectUser} 
              onSelectResult={handleSelectTrack}
              weeks={weeks}
              selectedIndex={selectedIndex}
            />
          )}

        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-zinc-950/80 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 backdrop-blur-sm">
           <div className="flex gap-4">
               <span className="flex items-center gap-1.5">
                 <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300 font-sans">↵</kbd> 
                 pasirinkti
               </span>
               <span className="flex items-center gap-1.5">
                 <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300 font-sans">↑↓</kbd> 
                 naviguoti
               </span>
               <span className="flex items-center gap-1.5">
                 <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300 font-sans">ESC</kbd> 
                 uždaryti
               </span>
           </div>
        </div>
      </div>
    </div>
  );
};