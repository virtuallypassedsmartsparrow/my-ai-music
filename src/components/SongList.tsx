import React, { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import type { Song } from '../types';
import { formatTime, formatDate } from '../utils/format';
import {
  Play,
  Pause,
  Search,
  X,
  Clock,
  ArrowUpDown,
  Download,
  Share2,
  Music2,
  Calendar,
  Shuffle,
  CheckCircle2,
  HardDriveDownload
} from 'lucide-react';

export const SongList: React.FC = () => {
  const {
    songs,
    currentSong,
    isPlaying,
    playSong,
    toggleShuffle,
    offlineIds,
    toggleSongOffline
  } = usePlayer();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'duration'>('newest');

  // Filter and sort
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'duration') {
        return b.duration - a.duration;
      }
      return 0;
    });

    return result;
  }, [songs, searchTerm, sortBy]);

  const handleShare = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Check out "${song.title}" on AI Beats!`,
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

  const handleDownloadMp3 = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = song.url;
    link.download = `${song.title}.mp3`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleOffline = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    await toggleSongOffline(song);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-36">
      {/* Search Bar & Action Controls */}
      <div className="flex items-center space-x-2 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#0c121e] border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Shuffle All Button */}
        {songs.length > 1 && (
          <button
            onClick={() => {
              toggleShuffle();
              const randomIdx = Math.floor(Math.random() * songs.length);
              playSong(songs[randomIdx]);
            }}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-[#0c121e] border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 text-xs font-semibold text-slate-300 transition-all active:scale-95 shrink-0"
            title="Shuffle play all tracks"
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        )}

        {/* Sort Selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none bg-[#0c121e] border border-slate-800 text-slate-300 text-xs rounded-xl pl-7 pr-6 py-2.5 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="title">A-Z</option>
            <option value="duration">Length</option>
          </select>
          <ArrowUpDown className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Song List Dump */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#0c121e]/60 rounded-2xl border border-slate-800/80 my-4">
          <Music2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300 mb-1">No songs found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'No tracks matching that search.'
              : 'Drop your .mp3 files into public/audio/ and run npm run sync, or use the lock icon to upload!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSongs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            const isCurrentPlaying = isCurrent && isPlaying;
            const isOffline = offlineIds.includes(song.id);

            return (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                className={`group relative flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-[#0f192b] border-cyan-500/80 neon-border-cyan shadow-xl shadow-cyan-950/30'
                    : 'bg-[#0a0f19]/80 border-slate-800/70 hover:bg-[#0e1624] hover:border-slate-700'
                }`}
              >
                {/* Left: Thumbnail & Song Info */}
                <div className="flex items-center space-x-3.5 min-w-0 pr-2 flex-1">
                  {/* Artwork / Equalizer / Index */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-slate-700/60 shadow-md">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-cyan-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-cyan-400/90">
                          #{index + 1}
                        </span>
                      </div>
                    )}

                    {/* Animated Equalizer Overlay when playing */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <div className="flex items-end space-x-1 h-5">
                          <span className="w-1 bg-cyan-400 rounded-full equalizer-bar-1" />
                          <span className="w-1 bg-emerald-400 rounded-full equalizer-bar-2" />
                          <span className="w-1 bg-cyan-300 rounded-full equalizer-bar-3" />
                          <span className="w-1 bg-emerald-300 rounded-full equalizer-bar-4" />
                        </div>
                      ) : (
                        <Play className="w-4 h-4 text-cyan-400 fill-cyan-400 ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Title & Artist & Offline Badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`text-sm font-bold truncate tracking-tight ${
                          isCurrent ? 'text-cyan-300' : 'text-slate-100'
                        }`}
                      >
                        {song.title}
                      </h3>
                      {isOffline && (
                        <span
                          className="flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 shrink-0"
                          title="Downloaded to phone storage (no data needed)"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                          Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-slate-400 space-x-2 mt-0.5">
                      <span className="truncate text-slate-400 font-medium">
                        {song.artist || 'AI Music'}
                      </span>
                      {song.createdAt && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="flex items-center text-[11px] text-slate-500 shrink-0">
                            <Calendar className="w-3 h-3 mr-1 opacity-70" />
                            {formatDate(song.createdAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Duration */}
                <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                  {song.duration > 0 && (
                    <span className="text-xs font-mono text-slate-400 hidden sm:flex items-center mr-1">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      {formatTime(song.duration)}
                    </span>
                  )}

                  {/* Offline Cache Toggle (Saves data on phone) */}
                  <button
                    onClick={(e) => handleToggleOffline(e, song)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isOffline
                        ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40'
                        : 'text-slate-500 hover:text-cyan-300 hover:bg-slate-800'
                    }`}
                    title={isOffline ? 'Saved offline (tap to remove)' : 'Save offline to listen without data'}
                  >
                    {isOffline ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <HardDriveDownload className="w-4 h-4" />
                    )}
                  </button>

                  {/* Download MP3 file */}
                  <button
                    onClick={(e) => handleDownloadMp3(e, song)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Download MP3 file"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Share button */}
                  <button
                    onClick={(e) => handleShare(e, song)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Share link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* Play/Pause Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSong(song);
                    }}
                    className={`p-2.5 rounded-full transition-all ml-1 ${
                      isCurrentPlaying
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold shadow-lg shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-200 hover:bg-cyan-500 hover:text-black'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
