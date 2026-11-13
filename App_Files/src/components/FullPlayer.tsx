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
  Disc3,
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
    <div className="fixed inset-0 z-50 bg-[#050507] flex flex-col justify-between p-6 safe-top safe-bottom animate-in fade-in duration-200">
      {/* Dynamic blurred ambient glow behind player */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentSong.coverUrl ? (
          <div
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-20 blur-3xl saturate-50 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
          />
        ) : (
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white/[0.03] blur-[120px]" />
        )}
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={() => setFullPlayerOpen(false)}
          className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Now Playing
          </p>
          <p className="text-xs text-zinc-500">
            {currentIndex + 1} of {songs.length}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all"
          aria-label="Share song"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Center Artwork */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[75vw] max-h-[75vw] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black border border-white/10">
          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-100' : 'scale-95 opacity-90'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-[#121215] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-3 shadow-md">
                <Disc3 className="w-10 h-10 text-zinc-300" />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
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
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {currentSong.title}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm font-medium text-zinc-400 truncate">
                {currentSong.artist || 'AI Music'}
              </p>
              {isOffline && (
                <span className="flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-white" />
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
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
              title={isOffline ? 'Downloaded to phone' : 'Save offline (listen without data)'}
            >
              {isOffline ? (
                <CheckCircle2 className="w-5 h-5 text-black" />
              ) : (
                <HardDriveDownload className="w-5 h-5" />
              )}
            </button>

            {/* Direct MP3 file download */}
            <button
              onClick={handleDownloadMp3}
              className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
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
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
          />
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
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
                ? 'text-white bg-zinc-800 border border-white/20'
                : 'text-zinc-500 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevSong}
            className="p-2.5 rounded-full text-zinc-300 hover:text-white active:scale-95 transition-all"
            title="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Large Hero Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
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
            className="p-2.5 rounded-full text-zinc-300 hover:text-white active:scale-95 transition-all"
            title="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-white bg-zinc-800 border border-white/20'
                : 'text-zinc-500 hover:text-white'
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
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-400" />
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
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
