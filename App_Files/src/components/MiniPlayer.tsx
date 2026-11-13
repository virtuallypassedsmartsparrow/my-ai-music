import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import { Play, Pause, SkipBack, SkipForward, Loader2, Disc3, Volume2, VolumeX } from 'lucide-react';

export const MiniPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    togglePlay,
    prevSong,
    nextSong,
    seekTo,
    setFullPlayerOpen
  } = usePlayer();

  if (!currentSong) return null;

  const effectiveDuration = duration > 0 ? duration : (currentSong.duration || 100);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div
      onClick={() => setFullPlayerOpen(true)}
      className="fixed bottom-0 left-0 right-0 z-40 p-2.5 safe-bottom cursor-pointer select-none"
    >
      <div className="max-w-2xl md:max-w-4xl mx-auto relative rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black overflow-hidden transition-all hover:border-white/20">
        {/* Progress Bar Header (Mobile only; Desktop has interactive scrubber below) */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-zinc-800">
          <div
            className="h-full bg-white transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between p-2.5 md:px-4 md:py-3 gap-3">
          {/* Left: Song info & artwork */}
          <div className="flex items-center space-x-3 min-w-0 flex-1 md:w-1/3 md:flex-none">
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

          {/* Center: Quick controls (+ Desktop Scrubber like Spotify Desktop) */}
          <div className="flex flex-col items-center shrink-0 md:flex-1 md:max-w-md">
            <div className="flex items-center space-x-1.5">
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

            {/* Desktop Interactive Scrubber */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="hidden md:flex items-center space-x-2 w-full mt-1"
            >
              <span className="text-[10px] font-mono text-zinc-400 w-9 text-right shrink-0">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={effectiveDuration}
                step={0.1}
                value={Math.min(currentTime, effectiveDuration)}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                aria-label="Song progress scrubber"
              />
              <span className="text-[10px] font-mono text-zinc-400 w-9 shrink-0">
                {formatTime(effectiveDuration)}
              </span>
            </div>
          </div>

          {/* Right: Desktop Volume Bar (matches Spotify Desktop — hidden on mobile phones) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="hidden md:flex items-center justify-end space-x-2 md:w-1/4 shrink-0"
          >
            <button
              onClick={toggleMute}
              className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0"
              aria-label={isMuted ? "Unmute" : "Mute"}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-300" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
