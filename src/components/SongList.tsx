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
  Disc3,
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
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#111114] border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
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
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-[#111114] border border-zinc-800 hover:border-zinc-600 hover:text-white text-xs font-semibold text-zinc-300 transition-all active:scale-95 shrink-0"
            title="Shuffle play all tracks"
          >
            <Shuffle className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        )}

        {/* Sort Selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none bg-[#111114] border border-zinc-800 text-zinc-300 text-xs rounded-xl pl-7 pr-6 py-2.5 focus:outline-none focus:border-zinc-500 transition-all cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="title">A-Z</option>
            <option value="duration">Length</option>
          </select>
          <ArrowUpDown className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* Song List Dump */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#111114]/60 rounded-2xl border border-zinc-800/80 my-4">
          <Disc3 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300 mb-1">No songs found</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
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
                    ? 'swish-card-active'
                    : 'swish-card hover:border-zinc-700 hover:bg-[#18181c]'
                }`}
              >
                {/* Left: Thumbnail & Song Info */}
                <div className="flex items-center space-x-3.5 min-w-0 pr-2 flex-1">
                  {/* Track Number / Artwork / Equalizer */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 shadow-md">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#18181b] flex flex-col items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-zinc-400">
                          #{index + 1}
                        </span>
                      </div>
                    )}

                    {/* Animated Equalizer Overlay when playing */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <div className="flex items-end space-x-1 h-5">
                          <span className="w-1 bg-white rounded-full equalizer-bar-1" />
                          <span className="w-1 bg-zinc-300 rounded-full equalizer-bar-2" />
                          <span className="w-1 bg-white rounded-full equalizer-bar-3" />
                          <span className="w-1 bg-zinc-400 rounded-full equalizer-bar-4" />
                        </div>
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Title & Artist & Offline Badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`text-sm font-semibold truncate tracking-tight ${
                          isCurrent ? 'text-white' : 'text-zinc-200'
                        }`}
                      >
                        {song.title}
                      </h3>
                      {isOffline && (
                        <span
                          className="flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0"
                          title="Downloaded to phone storage (no data needed)"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-zinc-300" />
                          Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-zinc-400 space-x-2 mt-0.5">
                      <span className="truncate text-zinc-400 font-medium">
                        {song.artist || 'AI Music'}
                      </span>
                      {song.createdAt && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="flex items-center text-[11px] text-zinc-500 shrink-0">
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
                    <span className="text-xs font-mono text-zinc-400 hidden sm:flex items-center mr-1">
                      <Clock className="w-3 h-3 mr-1 text-zinc-500" />
                      {formatTime(song.duration)}
                    </span>
                  )}

                  {/* Offline Cache Toggle */}
                  <button
                    onClick={(e) => handleToggleOffline(e, song)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isOffline
                        ? 'text-white bg-zinc-800'
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={isOffline ? 'Saved offline (tap to remove)' : 'Save offline to listen without data'}
                  >
                    {isOffline ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <HardDriveDownload className="w-4 h-4" />
                    )}
                  </button>

                  {/* Download MP3 file */}
                  <button
                    onClick={(e) => handleDownloadMp3(e, song)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    title="Download MP3 file"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Share button */}
                  <button
                    onClick={(e) => handleShare(e, song)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
                        ? 'bg-white text-black font-bold shadow-lg shadow-white/10'
                        : 'bg-zinc-800 text-zinc-200 hover:bg-white hover:text-black'
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
