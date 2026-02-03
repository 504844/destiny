import React from 'react';

interface DiscordImportProps {
  rawText: string;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isEditMode?: boolean;
}

export const DiscordImport: React.FC<DiscordImportProps> = ({ rawText, onTextChange, isEditMode }) => {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase flex justify-between">
        <span>Discord Text Dump</span>
        <span className="text-zinc-600 normal-case">Visas tekstas iš Discord</span>
      </label>
      <textarea
        value={rawText}
        onChange={onTextChange}
        className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-white/10 resize-none"
        placeholder={isEditMode ? "Įklijuokite, jei norite PERRAŠYTI esamą sąrašą..." : "Paste here..."}
      />
    </div>
  );
};