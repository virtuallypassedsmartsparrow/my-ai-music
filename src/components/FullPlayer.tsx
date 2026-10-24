import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Loader2,
  Music2,
  HardDriveDownload,
  CheckCircle2
} from 'lucide-react';

export const FullPlayer: React.FC = () => {
  const {
    currentSong,
    currentIndex,
    songs,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isFullPlayerOpen,
    offlineIds,
    setFullPlayerOpen,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleSongOffline
  } = usePlayer();

  if (!isFullPlayerOpen || !currentSong) return null;

  const isOffline = offlineIds.includes(currentSong.id);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentSong.title,
          text: `Listen to "${currentSong.title}" on AI Beats!`,
          url: window.location.href
        });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownloadMp3 = () => {
    const link = document.createElement('a');
    link.href = currentSong.url;
    link.download = `${currentSong.title}.mp3`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050811] flex flex-col justify-between p-6 safe-top safe-bottom animate-in fade-in duration-200">
      {/* Dynamic blurred ambient glow behind player */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentSong.coverUrl ? (
          <div
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-20 blur-3xl saturate-150 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
          />
        ) : (
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        )}
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={() => setFullPlayerOpen(false)}
          className="p-2.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition-all"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            Playing
          </p>
          <p className="text-xs text-slate-400">
            {currentIndex + 1} of {songs.length}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="p-2.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition-all"
          aria-label="Share song"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Center Artwork */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[75vw] max-h-[75vw] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/40 border border-slate-700/80">
          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-100' : 'scale-95 opacity-90'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-cyan-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/20">
                <Music2 className="w-10 h-10 text-cyan-400" />
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                AI Beats
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Song Details & Controls */}
      <div className="relative z-10 max-w-md mx-auto w-full space-y-6">
        {/* Title, Artist, & Download Actions */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {currentSong.title}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm font-medium text-slate-400 truncate">
                {currentSong.artist || 'AI Music'}
              </p>
              {isOffline && (
                <span className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  Offline Ready
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Toggle Offline Cache */}
            <button
              onClick={() => toggleSongOffline(currentSong)}
              className={`p-3 rounded-full border transition-all ${
                isOffline
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700'
              }`}
              title={isOffline ? 'Downloaded to phone' : 'Save offline (listen without data)'}
            >
              {isOffline ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <HardDriveDownload className="w-5 h-5" />
              )}
            </button>

            {/* Direct MP3 file download */}
            <button
              onClick={handleDownloadMp3}
              className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              title="Download MP3 file"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Playback Controls */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle
                ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                : 'text-slate-500 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevSong}
            className="p-2.5 rounded-full text-slate-300 hover:text-white active:scale-95 transition-all"
            title="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Large Hero Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black flex items-center justify-center font-bold shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all neon-glow-cyan"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-7 h-7 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextSong}
            className="p-2.5 rounded-full text-slate-300 hover:text-white active:scale-95 transition-all"
            title="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                : 'text-slate-500 hover:text-white'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume Slider Row */}
        <div className="flex items-center space-x-3 px-4 pt-1">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
