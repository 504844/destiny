import React, { useState } from 'react';
import { X, LockKeyhole } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onLogin();
    } else {
      alert('Neteisingas slaptažodis');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/50 ring-1 ring-white/5 scale-100 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">Admin Prieiga</h2>
              <p className="text-xs text-zinc-500">Redaguoti savaites ir dainas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-900 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all text-sm"
              placeholder="Įveskite slaptažodį..."
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-white/5"
          >
            Prisijungti
          </button>
        </form>
      </div>
    </div>
  );
};