import React, { useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchInputProps {
  query: string;
  setQuery: (val: string) => void;
  onClose: () => void;
  loading: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ query, setQuery, onClose, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="flex items-center px-4 py-5 border-b border-zinc-800 bg-zinc-900/50">
      <Search className="w-5 h-5 text-indigo-400 mr-4" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-xl text-white placeholder:text-zinc-600 font-medium tracking-tight"
        placeholder="Ieškoti dainų, atlikėjų, vartotojų..."
        autoComplete="off"
        autoCorrect="off"
      />
      {loading ? (
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      ) : (
        <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 transition-colors"
        >
            <span className="text-xs font-medium px-1.5 py-0.5 border border-zinc-700 rounded bg-zinc-900">ESC</span>
        </button>
      )}
    </div>
  );
};