import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Week } from '../../types';
import { parseDiscordDump, DraftTrackWithId } from '../../lib/parsers';
import { generateId } from '../../lib/utils';
import { searchExternalMetadata } from '../../services/metadata';
import { 
  Upload, Check, AlertCircle, X, Terminal, 
  Calendar, Hash, Edit2, RefreshCw, Trash2, 
  Plus, ChevronRight, Save, LayoutList, FileText, GripVertical,
  Wand2, Download
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminBarProps {
  weeks: Week[];
  onSuccess: (weekId: string) => void;
  onClose: () => void;
}

export const AdminBar: React.FC<AdminBarProps> = ({ weeks, onSuccess, onClose }) => {
  const [viewMode, setViewMode] = useState<'INPUT' | 'REVIEW'>('INPUT');
  const [rawText, setRawText] = useState('');
  
  // Data State
  const [weekNumber, setWeekNumber] = useState<number>(0);
  const [dateRange, setDateRange] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [tracks, setTracks] = useState<DraftTrackWithId[]>([]);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isEditingTrack, setIsEditingTrack] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Derived State
  const existingWeek = weeks.find(w => w.week_number === weekNumber);
  const mode = existingWeek ? 'UPDATE' : 'CREATE';
  const isValid = weekNumber > 0 && dateRange.length > 0 && tracks.length > 0;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // --- Handlers ---

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    
    // Auto-Parse
    if (text.length > 10) {
        const result = parseDiscordDump(text, 1);
        if (result.weekNumber) setWeekNumber(result.weekNumber);
        if (result.spotifyUrl) setSpotifyUrl(result.spotifyUrl);
        if (result.tracks.length > 0) {
            setTracks(result.tracks);
            setViewMode('REVIEW'); // Switch view automatically if successful
        }
    }
  };

  const handleReset = () => {
    setRawText('');
    setTracks([]);
    setWeekNumber(0);
    setDateRange('');
    setSpotifyUrl('');
    setViewMode('INPUT');
    setStatus('idle');
  };

  const loadExistingWeekData = async () => {
    if (!existingWeek) return;
    
    setStatus('processing');
    try {
        const { data, error } = await supabase
            .from('tracks')
            .select('*')
            .eq('week_id', existingWeek.id)
            .order('position', { ascending: true });
            
        if (error) throw error;
        
        if (data) {
            setDateRange(existingWeek.date_range);
            setSpotifyUrl(existingWeek.spotify_url || '');
            
            const loadedTracks: DraftTrackWithId[] = data.map(t => ({
                _id: generateId(),
                title: t.title,
                artists: t.artists,
                submitted_by: t.submitted_by,
                position: t.position,
                medal: t.medal,
                bpm: t.bpm,
                energy: t.energy,
                country: t.country
            }));
            
            setTracks(loadedTracks);
            setViewMode('REVIEW');
            setStatus('idle');
        }
    } catch (e: any) {
        setStatus('error');
        setStatusMsg(e.message);
    }
  };

  const handleMagicScan = async () => {
      if (isScanning) return;
      setIsScanning(true);
      
      const newTracks = [...tracks];
      let updatedCount = 0;

      for (let i = 0; i < newTracks.length; i++) {
          const track = newTracks[i];
          // Skip if already has full data
          if (track.bpm && track.energy) continue;

          try {
              // We cast DraftTrack to Track-like object for the search service
              const result = await searchExternalMetadata({
                  id: 'temp',
                  week_id: 'temp',
                  title: track.title,
                  artists: track.artists,
                  created_at: '',
                  position: 0,
                  medal: null,
                  submitted_by: null
              });

              if (result && (result.bpm || result.energy)) {
                  newTracks[i] = {
                      ...track,
                      bpm: result.bpm || track.bpm,
                      energy: result.energy || track.energy,
                  };
                  updatedCount++;
                  // Force update UI every few items so user sees progress
                  if (updatedCount % 2 === 0) setTracks([...newTracks]);
              }
              
              // Slight delay to avoid rate limits
              await new Promise(r => setTimeout(r, 200));
              
          } catch (e) {
              console.warn("Scan failed for", track.title);
          }
      }
      
      setTracks(newTracks);
      setIsScanning(false);
      alert(`Scan complete! Updated ${updatedCount} tracks.`);
  };

  const handleTrackChange = (id: string, field: keyof DraftTrackWithId, value: any) => {
    setTracks(prev => prev.map(t => {
      if (t._id !== id) return t;
      const updated = { ...t, [field]: value };
      return updated;
    }));
  };

  const handleDeleteTrack = (id: string) => {
    setTracks(prev => {
        const filtered = prev.filter(t => t._id !== id);
        // Re-index positions after delete
        return filtered.map((t, idx) => ({
            ...t,
            position: idx + 1,
            medal: (idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null) as any
        }));
    });
  };

  const handleAddTrack = () => {
    const nextPos = tracks.length + 1;
    const newTrack: DraftTrackWithId = {
        _id: generateId(),
        position: nextPos,
        artists: '',
        title: '',
        submitted_by: null,
        medal: null
    };
    setTracks(prev => [...prev, newTrack]);
    setIsEditingTrack(newTrack._id);
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Firefox requires dataTransfer data to be set
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.setDragImage(new Image(), 0, 0); // Hide default ghost
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Create a copy
    const newTracks = [...tracks];
    const draggedItem = newTracks[draggedIndex];
    
    // Remove from old index
    newTracks.splice(draggedIndex, 1);
    // Insert at new index
    newTracks.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setTracks(newTracks);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    // Recalculate positions and medals based on new order
    const reordered = tracks.map((t, idx) => ({
        ...t,
        position: idx + 1,
        medal: (idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null) as any
    }));
    setTracks(reordered);
  };

  const execute = async () => {
    if (!isValid) return;

    setStatus('processing');
    
    try {
      let weekId = existingWeek?.id;

      if (mode === 'UPDATE' && weekId) {
        // Update Week
        const { error: wErr } = await supabase
          .from('weeks')
          .update({ week_number: weekNumber, date_range: dateRange, spotify_url: spotifyUrl || null, track_count: tracks.length })
          .eq('id', weekId);
        if (wErr) throw wErr;

        // Clear old tracks
        await supabase.from('tracks').delete().eq('week_id', weekId);
      } else {
        // Create Week
        const { data: wData, error: wErr } = await supabase
          .from('weeks')
          .insert({ week_number: weekNumber, date_range: dateRange, spotify_url: spotifyUrl || null, track_count: tracks.length })
          .select()
          .single();
        if (wErr) throw wErr;
        weekId = wData.id;
      }

      // Insert Tracks
      const { error: tErr } = await supabase.from('tracks').insert(
        tracks.map(t => ({
          week_id: weekId,
          title: t.title,
          artists: t.artists,
          submitted_by: t.submitted_by || null,
          position: t.position,
          medal: t.medal,
          bpm: t.bpm || null,
          energy: t.energy || null,
          country: t.country || null
        }))
      );
      if (tErr) throw tErr;

      setStatus('success');
      setTimeout(() => {
        onSuccess(weekId!);
        handleReset();
        onClose();
      }, 1500);

    } catch (e: any) {
      setStatus('error');
      setStatusMsg(e.message);
    }
  };

  // --- Render ---

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Admin Console</h2>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-zinc-500 font-mono">
                    {viewMode === 'INPUT' ? 'Ready for Input' : `${tracks.length} Tracks Loaded`}
                    </p>
                    {mode === 'UPDATE' && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 rounded border border-amber-500/20 font-bold">UPDATING WEEK {weekNumber}</span>
                    )}
                </div>
              </div>
           </div>
           <div className="flex items-center gap-2">
             {viewMode === 'REVIEW' && (
                <>
                    <button 
                        onClick={handleMagicScan}
                        disabled={isScanning}
                        className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border",
                            isScanning 
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse" 
                                : "bg-indigo-500 hover:bg-indigo-400 text-white border-transparent shadow-lg shadow-indigo-500/20"
                        )}
                        title="Auto-fill BPM and Energy from Spotify"
                    >
                        <Wand2 className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
                        {isScanning ? 'Scanning...' : 'Auto-Fill Stats'}
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />
                    <button 
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Reset
                    </button>
                </>
             )}
             <button 
               onClick={onClose} 
               className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
             >
                <X className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-black/20 min-h-0">
            
            {/* MODE: INPUT */}
            {viewMode === 'INPUT' && (
                <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 overflow-y-auto">
                    {/* Week Number Prompt for loading existing data */}
                    <div className="flex items-end gap-4">
                        <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Week Number
                             </label>
                             <input 
                                type="number"
                                autoFocus
                                value={weekNumber || ''}
                                onChange={e => setWeekNumber(parseInt(e.target.value))}
                                className="w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-indigo-500/50 outline-none transition-colors"
                                placeholder="#"
                             />
                         </div>
                         {existingWeek && (
                             <button 
                                onClick={loadExistingWeekData}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg border border-zinc-700 flex items-center gap-2 transition-all animate-in fade-in"
                             >
                                 <Download className="w-3.5 h-3.5" />
                                 Load Existing Data
                             </button>
                         )}
                    </div>

                    <div className="w-full h-px bg-zinc-800/50" />

                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 border-dashed text-center space-y-2">
                       <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                       <h3 className="text-sm font-medium text-zinc-300">Quick Import from Discord</h3>
                       <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                          Paste your Discord message here. The system will automatically detect the Week Number, Dates, and Tracks.
                       </p>
                    </div>
                    <textarea
                        value={rawText}
                        onChange={handlePaste}
                        className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500/50 resize-none placeholder:text-zinc-700 transition-colors"
                        placeholder="Paste text here..."
                    />
                </div>
            )}

            {/* MODE: REVIEW */}
            {viewMode === 'REVIEW' && (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 min-h-0">
                    
                    {/* Metadata Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
                         <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Week Number
                             </label>
                             <input 
                                type="number"
                                value={weekNumber || ''}
                                onChange={e => setWeekNumber(parseInt(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-zinc-700 outline-none transition-colors"
                                placeholder="#"
                             />
                         </div>
                         <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Date Range
                             </label>
                             <input 
                                type="text"
                                value={dateRange}
                                onChange={e => setDateRange(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-zinc-700 outline-none transition-colors"
                                placeholder="Month DD - DD"
                             />
                         </div>
                    </div>

                    {/* Track List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative min-h-0">
                        {tracks.map((track, index) => (
                            <div 
                                key={track._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "group flex items-center gap-3 p-2 rounded-lg border transition-all text-xs cursor-default relative select-none",
                                    isEditingTrack === track._id 
                                        ? "bg-zinc-900 border-zinc-700 ring-1 ring-zinc-700/50" 
                                        : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700",
                                    draggedIndex === index && "opacity-30 bg-indigo-500/10 border-indigo-500/50 scale-[0.98]"
                                )}
                                onClick={() => setIsEditingTrack(track._id)}
                            >
                                {/* Drag Handle */}
                                <div className="hidden group-hover:flex absolute left-1 top-1/2 -translate-y-1/2 text-zinc-600 cursor-grab active:cursor-grabbing p-1.5 hover:text-zinc-300 z-10 hover:bg-zinc-800 rounded">
                                    <GripVertical className="w-4 h-4" />
                                </div>

                                <div className={cn(
                                    "w-8 h-8 rounded-md flex items-center justify-center font-mono font-bold shrink-0 text-xs ml-2 sm:ml-6 transition-all duration-300",
                                    track.position === 1 ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20" :
                                    track.position === 2 ? "bg-slate-400/10 text-slate-400 ring-1 ring-slate-400/20" :
                                    track.position === 3 ? "bg-amber-700/10 text-amber-700 ring-1 ring-amber-700/20" :
                                    "bg-zinc-800 text-zinc-500"
                                )}>
                                    {track.position}
                                </div>

                                {isEditingTrack === track._id ? (
                                    <div className="flex-1 grid grid-cols-12 gap-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="col-span-12 sm:col-span-4 space-y-1">
                                            <input 
                                                autoFocus
                                                value={track.title}
                                                onChange={e => handleTrackChange(track._id, 'title', e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-white placeholder:text-zinc-600 outline-none"
                                                placeholder="Title"
                                            />
                                            <input 
                                                value={track.artists}
                                                onChange={e => handleTrackChange(track._id, 'artists', e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 placeholder:text-zinc-600 outline-none"
                                                placeholder="Artist"
                                            />
                                        </div>
                                        
                                        {/* Stats */}
                                        <div className="col-span-4 sm:col-span-2 space-y-1">
                                            <input 
                                                type="number"
                                                value={track.bpm || ''}
                                                onChange={e => handleTrackChange(track._id, 'bpm', parseInt(e.target.value))}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-400 placeholder:text-zinc-700 outline-none"
                                                placeholder="BPM"
                                            />
                                            <input 
                                                type="number"
                                                value={track.energy || ''}
                                                onChange={e => handleTrackChange(track._id, 'energy', parseInt(e.target.value))}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-400 placeholder:text-zinc-700 outline-none"
                                                placeholder="Energy"
                                            />
                                        </div>

                                        <div className="col-span-4 sm:col-span-2 space-y-1">
                                            <input 
                                                value={track.country || ''}
                                                maxLength={2}
                                                onChange={e => handleTrackChange(track._id, 'country', e.target.value.toUpperCase())}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-400 placeholder:text-zinc-700 outline-none uppercase font-mono"
                                                placeholder="ISO"
                                            />
                                            <input 
                                                value={track.submitted_by || ''}
                                                onChange={e => handleTrackChange(track._id, 'submitted_by', e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-400 placeholder:text-zinc-700 outline-none"
                                                placeholder="@User"
                                            />
                                        </div>

                                        <div className="col-span-4 sm:col-span-4 flex items-end justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track._id); }} className="text-xs text-red-500 hover:underline px-2 py-1.5">Delete</button>
                                            <button onClick={(e) => { e.stopPropagation(); setIsEditingTrack(null); }} className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded hover:bg-emerald-500/20 font-bold border border-emerald-500/20">Done</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                            <span className="font-medium text-zinc-200 truncate">{track.title}</span>
                                            <div className="flex items-center gap-1.5 text-zinc-500">
                                                <span className="truncate max-w-[150px]">{track.artists}</span>
                                                {track.submitted_by && (
                                                    <>
                                                        <span className="text-zinc-700">•</span>
                                                        <span className="text-zinc-500 text-[10px]">@{track.submitted_by}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Status Pills */}
                                        <div className="flex items-center gap-1">
                                            {track.bpm && track.energy ? (
                                                <div className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono">
                                                    {track.bpm} / {track.energy}
                                                </div>
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" title="Missing Audio Features" />
                                            )}
                                            {track.country ? (
                                                <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">
                                                    {track.country}
                                                </div>
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" title="Missing Country" />
                                            )}
                                        </div>

                                        <Edit2 className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </>
                                )}
                            </div>
                        ))}
                        
                        <button 
                            onClick={handleAddTrack}
                            className="w-full py-3 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 transition-all text-xs font-medium"
                        >
                            <Plus className="w-3 h-3" /> Add Track Manually
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                 <div className={cn(
                     "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                     mode === 'UPDATE' 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                 )}>
                     {mode === 'UPDATE' ? 'Update Mode' : 'Create Mode'}
                 </div>
                 {status === 'error' && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {statusMsg}
                    </span>
                 )}
            </div>
            
            <button
                onClick={execute}
                disabled={!isValid || status === 'processing'}
                className={cn(
                    "px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all",
                    status === 'processing' ? "bg-zinc-800 text-zinc-500" :
                    status === 'success' ? "bg-emerald-500 text-black" :
                    mode === 'UPDATE' ? "bg-amber-500 hover:bg-amber-400 text-black" : 
                    "bg-white hover:bg-zinc-200 text-black"
                )}
            >
                {status === 'processing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {status === 'success' ? 'Done' : 'Publish'}
            </button>
        </div>

      </div>
    </div>
  );
};