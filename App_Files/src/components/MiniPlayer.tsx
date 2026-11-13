import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Loader2, Disc3 } from 'lucide-react';

export const MiniPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
    prevSong,
    nextSong,
    setFullPlayerOpen
  } = usePlayer();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={() => setFullPlayerOpen(true)}
      className="fixed bottom-0 left-0 right-0 z-40 p-2.5 safe-bottom cursor-pointer select-none"
    >
      <div className="max-w-2xl mx-auto relative rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black overflow-hidden transition-all hover:border-white/20">
        {/* Progress Bar Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
          <div
            className="h-full bg-white transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between p-2.5">
          {/* Song info & artwork */}
          <div className="flex items-center space-x-3 min-w-0 pr-3 flex-1">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10">
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
                  <Disc3 className="w-5 h-5 text-zinc-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {currentSong.title}
              </h4>
              <p className="text-xs text-zinc-400 truncate">
                {currentSong.artist || 'AI Music'}
              </p>
            </div>
          </div>

          {/* Quick controls: Prev, Play/Pause, Next */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Previous song button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSong();
              }}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-95 transition-all"
              aria-label="Previous track"
              title="Previous song"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2.5 rounded-full bg-white text-black font-bold shadow-lg shadow-white/10 hover:bg-zinc-200 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
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
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-95 transition-all"
              aria-label="Next track"
              title="Next song"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
