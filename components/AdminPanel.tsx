import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DraftTrack, Track } from '../types';
import { X, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Trash2, Plus, PenLine } from 'lucide-react';

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

// Extended DraftTrack with unique ID for React rendering
interface DraftTrackWithId extends DraftTrack {
  _id: string; // Temporary ID for React keys
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

  // Generate unique ID for tracks
  const generateId = () => `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  const parseDiscordDump = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const tracks: DraftTrackWithId[] = [];
    let detectedWeekNum = 0;
    let detectedSpotifyUrl = '';
    let currentPosition = 1;

    lines.forEach(line => {
      // 1. Detect Week Number in Header
      if (line.toLowerCase().includes('savaitės')) {
        const match = line.match(/(\d+)-osios/);
        if (match) detectedWeekNum = parseInt(match[1]);
        return; 
      }

      // 2. Detect Spotify URL
      if (line.includes('open.spotify.com')) {
        detectedSpotifyUrl = line;
        return; 
      }

      // 3. Skip header filler text
      if (line.toLowerCase().includes('labas vakaras') || line.toLowerCase().includes('nuoroda į')) {
        return;
      }

      // 4. Parse Track Line
      const separatorRegex = /\s[–-]\s/;
      if (!separatorRegex.test(line)) return;

      const parts = line.split(separatorRegex);
      const artistRaw = parts[0].trim();
      let restOfLine = parts.slice(1).join(' - ').trim(); 

      // A. Extract Medal / Position
      let medal: 'gold' | 'silver' | 'bronze' | null = null;
      let position = currentPosition;

      if (restOfLine.includes('🥇')) {
        medal = 'gold';
        position = 1;
        restOfLine = restOfLine.replace('🥇', '');
      } else if (restOfLine.includes('🥈')) {
        medal = 'silver';
        position = 2;
        restOfLine = restOfLine.replace('🥈', '');
      } else if (restOfLine.includes('🥉')) {
        medal = 'bronze';
        position = 3;
        restOfLine = restOfLine.replace('🥉', '');
      } else {
        if (currentPosition < 4) currentPosition = 4;
        position = currentPosition;
      }

      // B. Extract Submitter
      let submittedBy = null;
      // Updated Regex: allow dots (.) and dashes (-) in usernames to handle "@S.H exe" correctly
      const submitterRegex = /(@[\w\p{L}\d_\s\.\-]+)|(\[[\w\p{L}\d_\s\.\-]+\])$/u;
      const submitterMatch = restOfLine.match(submitterRegex);

      if (submitterMatch) {
        const rawSubmitter = submitterMatch[0];
        restOfLine = restOfLine.replace(rawSubmitter, '');
        submittedBy = rawSubmitter.replace(/^@/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
      }

      // C. Final Title Cleanup
      const titleClean = restOfLine.trim();

      if (titleClean && artistRaw) {
        tracks.push({
          _id: generateId(),
          artists: artistRaw,
          title: titleClean,
          submitted_by: submittedBy,
          position: position,
          medal: medal
        });
        currentPosition++; 
      }
    });

    tracks.sort((a, b) => a.position - b.position);

    if (detectedWeekNum) setWeekNumber(detectedWeekNum);
    if (detectedSpotifyUrl) setSpotifyUrl(detectedSpotifyUrl);
    
    setParsedTracks(tracks);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
    parseDiscordDump(e.target.value);
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Savaitės Nr.</label>
                <input
                  type="number"
                  value={weekNumber || ''}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                  placeholder="pvz. 19"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Data (Range)</label>
                <input
                  type="text"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                  placeholder="pvz. Gegužės 12 - 19"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase flex justify-between">
                <span>Discord Text Dump</span>
                <span className="text-zinc-600 normal-case">Visas tekstas iš Discord</span>
              </label>
              <textarea
                value={rawText}
                onChange={handleTextChange}
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-white/10 resize-none"
                placeholder={initialData ? "Įklijuokite, jei norite PERRAŠYTI esamą sąrašą..." : "Paste here..."}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Spotify URL</label>
              <input
                type="text"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 text-sm"
              />
            </div>
          </div>

          {/* Right Column: Editor (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Dainų Sąrašas ({parsedTracks.length})
              </h3>
              <button 
                onClick={addTrack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Pridėti dainą
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
              {sortedTracks.length > 0 ? (
                <div className="space-y-2">
                  {sortedTracks.map((track) => (
                    <div key={track._id} className="group flex items-start gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                      {/* Position */}
                      <div className="w-12 shrink-0">
                        <label className="block text-[10px] text-zinc-500 mb-1 uppercase text-center">Poz.</label>
                        <input 
                          type="number" 
                          value={track.position} 
                          onChange={(e) => updateTrack(track._id, 'position', parseInt(e.target.value) || 1)}
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded text-center text-sm py-1 font-mono focus:ring-1 focus:ring-white/20 outline-none ${track.medal === 'gold' ? 'text-yellow-500 font-bold' : track.medal === 'silver' ? 'text-slate-400 font-bold' : track.medal === 'bronze' ? 'text-amber-600 font-bold' : 'text-zinc-400'}`}
                        />
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="block text-[10px] text-zinc-500 uppercase">Atlikėjas</label>
                            <input 
                              value={track.artists}
                              onChange={(e) => updateTrack(track._id, 'artists', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
                              placeholder="Atlikėjas"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="block text-[10px] text-zinc-500 uppercase">Pavadinimas</label>
                            <input 
                              value={track.title}
                              onChange={(e) => updateTrack(track._id, 'title', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-zinc-200 font-medium placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
                              placeholder="Pavadinimas"
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5 relative">
                          <label className="block text-[10px] text-zinc-500 uppercase">Siūlė</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">@</span>
                            <input 
                              value={track.submitted_by || ''}
                              onChange={(e) => updateTrack(track._id, 'submitted_by', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-6 pr-2.5 py-1.5 text-sm text-zinc-400 placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-0 outline-none transition-colors"
                              placeholder="Vartotojas"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-6 shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteTrack(track._id);
                          }}
                          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                          title="Ištrinti dainą"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addTrack}
                    className="w-full py-3 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/30 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti dar vieną dainą
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                  <RefreshCw className="w-10 h-10 opacity-20" />
                  <p>Įklijuokite tekstą kairėje arba pridėkite rankiniu būdu</p>
                  <button onClick={addTrack} className="text-zinc-400 hover:text-white underline text-sm">
                    Pridėti tuščią dainą
                  </button>
                </div>
              )}
            </div>
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