import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Disc3, Download, Lock, CheckCircle2, Loader2 } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-[#070709]/90 backdrop-blur-xl border-b border-white/[0.07] px-4 py-3 safe-top">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 p-[1px] shadow-md flex items-center justify-center">
            <Disc3 className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white m-0">AI Beats</h1>
              <span className="flex items-center text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
                Vault
              </span>
            </div>
            <p className="text-xs text-zinc-400 m-0">
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
              {offlineIds.length > 0 && (
                <span className="text-zinc-300 ml-1.5 font-medium">
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
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                allDownloaded
                  ? 'bg-zinc-850 text-zinc-300 border-white/10'
                  : offlineProgress.isDownloading
                  ? 'bg-zinc-800 text-white border-white/20 animate-pulse'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
              }`}
              title="Download all songs to phone storage so you don't use cellular data"
            >
              {offlineProgress.isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>{offlineProgress.completed}/{offlineProgress.total}</span>
                </>
              ) : allDownloaded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-100" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="hidden sm:inline">Save All Offline</span>
                </>
              )}
            </button>
          )}

          {/* Install PWA Button */}
          {canInstallPwa && !isStandalone && (
            <button
              onClick={promptPwaInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-md shadow-white/5"
              title="Install to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          {/* Admin / Upload Button */}
          <button
            onClick={() => setAdminOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white active:scale-95 transition-all"
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
