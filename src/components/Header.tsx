import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Sparkles, Download, Lock, Radio } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    songs,
    setAdminOpen,
    canInstallPwa,
    isStandalone,
    promptPwaInstall
  } = usePlayer();

  return (
    <header className="sticky top-0 z-30 bg-[#090d16]/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 safe-top">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-violet-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold tracking-tight text-white m-0">AI Beats</h1>
              <span className="flex items-center text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                <Radio className="w-2.5 h-2.5 mr-1 text-emerald-400 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Install PWA Button (Hidden if already running as standalone app) */}
          {canInstallPwa && !isStandalone && (
            <button
              onClick={promptPwaInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/40 hover:bg-violet-600/30 active:scale-95 transition-all shadow-sm"
              title="Install to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Admin / Upload Button */}
          <button
            onClick={() => setAdminOpen(true)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700/80 hover:text-white active:scale-95 transition-all"
            title="Admin & Song Upload"
            aria-label="Upload Song / Admin"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
