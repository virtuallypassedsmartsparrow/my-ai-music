import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Sparkles, Download, Lock, CheckCircle2, Loader2 } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    songs,
    setAdminOpen,
    canInstallPwa,
    isStandalone,
    promptPwaInstall,
    offlineIds,
    downloadAllForOffline,
    offlineProgress
  } = usePlayer();

  const allDownloaded = songs.length > 0 && offlineIds.length >= songs.length;

  return (
    <header className="sticky top-0 z-30 bg-[#06090e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 safe-top">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#06090e] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight text-white m-0">AI Beats</h1>
              <span className="flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1.5" />
                Vault
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
              {offlineIds.length > 0 && (
                <span className="text-emerald-400 ml-1.5 font-medium">
                  • {offlineIds.length} offline
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Download All for Offline (Save cell data) */}
          {songs.length > 0 && (
            <button
              onClick={downloadAllForOffline}
              disabled={offlineProgress.isDownloading || allDownloaded}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                allDownloaded
                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                  : offlineProgress.isDownloading
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 animate-pulse'
                  : 'bg-slate-900 text-slate-300 border border-slate-700/60 hover:border-cyan-500/50 hover:text-cyan-300'
              }`}
              title="Download all songs to phone storage so you don't use cellular data"
            >
              {offlineProgress.isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>{offlineProgress.completed}/{offlineProgress.total}</span>
                </>
              ) : allDownloaded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Save All Offline</span>
                </>
              )}
            </button>
          )}

          {/* Install PWA Button */}
          {canInstallPwa && !isStandalone && (
            <button
              onClick={promptPwaInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-md shadow-cyan-600/20 hover:opacity-95 active:scale-95 transition-all"
              title="Install to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          {/* Admin / Upload Button */}
          <button
            onClick={() => setAdminOpen(true)}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 active:scale-95 transition-all"
            title="Upload Song / Admin"
            aria-label="Upload Song / Admin"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
