import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DraftTrack, Track } from '../types';
import { X, Upload, CheckCircle, AlertCircle, RefreshCw, PenLine } from 'lucide-react';
import { parseDiscordDump, DraftTrackWithId } from '../lib/parsers';
import { generateId } from '../lib/utils';

// Phase 3 Components
import { WeekMetadataForm } from './admin/WeekMetadataForm';
import { DiscordImport } from './admin/DiscordImport';
import { TrackEditorList } from './admin/TrackEditorList';

interface AdminPanelProps {
  onClose: () => void;
  onSuccess: (weekId: string) => void;
  initialData?: {
    weekId: string;
    weekNumber: number;
    dateRange: string;
    spotifyUrl: string;
    tracks: Track[];
  } | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onSuccess, initialData }) => {
  // Form State
  const [rawText, setRawText] = useState('');
  const [weekNumber, setWeekNumber] = useState<number>(0);
  const [dateRange, setDateRange] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [parsedTracks, setParsedTracks] = useState<DraftTrackWithId[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Initialize data if editing
  useEffect(() => {
    if (initialData) {
      setWeekNumber(initialData.weekNumber);
      setDateRange(initialData.dateRange);
      setSpotifyUrl(initialData.spotifyUrl);
      
      // Map existing tracks to DraftTrack format with unique IDs
      const drafts: DraftTrackWithId[] = initialData.tracks.map(t => ({
        _id: generateId(),
        title: t.title,
        artists: t.artists,
        submitted_by: t.submitted_by,
        position: t.position,
        medal: t.medal
      }));
      setParsedTracks(drafts);
    }
  }, [initialData]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    
    // Use the utility parser
    const result = parseDiscordDump(text, 1);
    
    // Update state only if values were found
    if (result.weekNumber) setWeekNumber(result.weekNumber);
    if (result.spotifyUrl) setSpotifyUrl(result.spotifyUrl);
    if (result.tracks.length > 0) {
        setParsedTracks(result.tracks.sort((a, b) => a.position - b.position));
    }
  };

  // --- Editing Functions ---

  const updateTrack = (id: string, field: keyof DraftTrack, value: any) => {
    setParsedTracks(prevTracks => {
      return prevTracks.map(track => {
        if (track._id !== id) return track;
        
        const updatedTrack = { ...track, [field]: value };

        // Auto-update medal if position changes
        if (field === 'position') {
          const pos = typeof value === 'string' ? parseInt(value) : value;
          if (pos === 1) updatedTrack.medal = 'gold';
          else if (pos === 2) updatedTrack.medal = 'silver';
          else if (pos === 3) updatedTrack.medal = 'bronze';
          else updatedTrack.medal = null;
        }

        return updatedTrack;
      });
    });
  };

  const deleteTrack = (id: string) => {
    if (window.confirm('Ar tikrai norite ištrinti šią dainą?')) {
      setParsedTracks(prevTracks => prevTracks.filter(t => t._id !== id));
    }
  };

  const addTrack = () => {
    const nextPos = parsedTracks.length > 0 
      ? Math.max(...parsedTracks.map(t => t.position)) + 1 
      : 1;
        
    setParsedTracks(prev => [...prev, {
      _id: generateId(),
      title: '',
      artists: '',
      submitted_by: '',
      position: nextPos,
      medal: null
    }]);
  };

  const handleUpload = async () => {
    if (!weekNumber || parsedTracks.length === 0 || !dateRange) {
      alert('Trūksta duomenų (savaitės numerio, dainų arba datos)');
      return;
    }

    setIsUploading(true);
    setStatusMessage('Vykdoma...');

    try {
      let weekId = initialData?.weekId;

      if (weekId) {
        // --- EDIT MODE ---
        setStatusMessage('Atnaujinama savaitė...');
        
        // 1. Update Week Info
        const { error: weekError } = await supabase
          .from('weeks')
          .update({
            week_number: weekNumber,
            date_range: dateRange,
            spotify_url: spotifyUrl || null,
            track_count: parsedTracks.length
          })
          .eq('id', weekId);

        if (weekError) throw weekError;

        // 2. Delete ALL existing tracks for this week
        setStatusMessage('Trinamos senos dainos...');
        
        // Attempt delete
        const { error: deleteError } = await supabase
          .from('tracks')
          .delete()
          .eq('week_id', weekId);

        if (deleteError) {
          console.error("Delete failed:", deleteError);
          throw new Error(`Nepavyko ištrinti senų dainų (Klaida: ${deleteError.message}). Patikrinkite DB leidimus.`);
        }

        // 3. VERIFY deletion - Crucial for "bulletproof" logic
        // If RLS silently blocked deletion, this count will be > 0.
        const { count, error: countError } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('week_id', weekId);

        if (countError) throw countError;
        
        if (count !== null && count > 0) {
          throw new Error("KLAIDA: Duomenų bazė neleido ištrinti senų dainų. Veikiausiai trūksta 'DELETE' teisių (RLS Policies).");
        }

      } else {
        // --- CREATE MODE ---
        setStatusMessage('Kuriama nauja savaitė...');
        const { data: weekData, error: weekError } = await supabase
          .from('weeks')
          .insert({
            week_number: weekNumber,
            date_range: dateRange,
            spotify_url: spotifyUrl || null,
            track_count: parsedTracks.length
          })
          .select()
          .single();

        if (weekError) throw weekError;
        weekId = weekData.id;
      }

      // 4. Insert Tracks (Both modes)
      setStatusMessage('Įrašomos dainos...');
      
      const tracksToInsert = parsedTracks.map(t => ({
        week_id: weekId,
        title: t.title,
        artists: t.artists,
        submitted_by: t.submitted_by || null, 
        position: t.position,
        medal: t.medal
      }));

      const { error: tracksError } = await supabase
        .from('tracks')
        .insert(tracksToInsert);

      if (tracksError) throw tracksError;

      setStatus('success');
      setStatusMessage(initialData ? 'Sėkmingai atnaujinta!' : 'Sėkmingai įkelta!');
      
      const finalWeekId = weekId;
      setTimeout(() => {
        onSuccess(finalWeekId!);
        onClose();
      }, 1000);

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setStatusMessage(`${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Sort tracks by position for display
  const sortedTracks = [...parsedTracks].sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {initialData ? <PenLine className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            {initialData ? `Redaguoti ${initialData.weekNumber} Savaitę` : 'Įkelti naują Topą'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <WeekMetadataForm 
              weekNumber={weekNumber} 
              setWeekNumber={setWeekNumber}
              dateRange={dateRange}
              setDateRange={setDateRange}
              spotifyUrl={spotifyUrl}
              setSpotifyUrl={setSpotifyUrl}
            />

            <DiscordImport 
              rawText={rawText} 
              onTextChange={handleTextChange} 
              isEditMode={!!initialData}
            />
          </div>

          {/* Right Column: Editor (8 cols) */}
          <div className="lg:col-span-8 h-full">
            <TrackEditorList 
              tracks={sortedTracks} 
              onUpdate={updateTrack} 
              onDelete={deleteTrack} 
              onAdd={addTrack}
            />
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-zinc-800 flex justify-between items-center bg-zinc-900">
          <div className="flex items-center gap-2">
            {status === 'success' && <span className="text-emerald-500 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {statusMessage}</span>}
            {status === 'error' && <span className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {statusMessage}</span>}
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading || parsedTracks.length === 0}
            className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Vykdoma...
              </>
            ) : (
              <>
                {initialData ? 'Atnaujinti Savaitę' : 'Įkelti Savaitę'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};