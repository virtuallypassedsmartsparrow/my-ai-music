import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, Loader2, Music2 } from 'lucide-react';

export const MiniPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
    nextSong,
    setFullPlayerOpen
  } = usePlayer();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={() => setFullPlayerOpen(true)}
      className="fixed bottom-0 left-0 right-0 z-40 p-2 safe-bottom cursor-pointer select-none"
    >
      <div className="max-w-2xl mx-auto relative rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/80 overflow-hidden transition-all hover:border-violet-500/40">
        {/* Progress Bar Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between p-2.5">
          {/* Song info & artwork */}
          <div className="flex items-center space-x-3 min-w-0 pr-3 flex-1">
            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-750">
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-violet-800 to-indigo-900 flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-violet-300" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {currentSong.title}
              </h4>
              <p className="text-xs text-slate-400 truncate">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2.5 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next song */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSong();
              }}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
