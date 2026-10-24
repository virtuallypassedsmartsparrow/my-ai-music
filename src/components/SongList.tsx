import React, { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import {
  Play,
  Pause,
  Search,
  X,
  ArrowUpDown,
  Disc3,
  Shuffle,
  CheckCircle2
} from 'lucide-react';

export const SongList: React.FC = () => {
  const {
    songs,
    currentSong,
    isPlaying,
    playSong,
    toggleShuffle,
    offlineIds
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
            {searchTerm ? 'No tracks matching that search.' : 'Drop your .mp3 files into public/audio/ and run UPDATE_AND_PUBLISH_SONGS.bat'}
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
                {/* Left: Artwork / Track Number */}
                <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 shadow-sm mr-3">
                  {song.coverUrl ? (
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
                      <span className="text-xs font-mono font-bold text-zinc-400">
                        #{index + 1}
                      </span>
                    </div>
                  )}

                  {/* Equalizer animation when playing */}
                  {isCurrentPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[1px]">
                      <div className="flex items-end space-x-0.5 h-4">
                        <span className="w-1 bg-white rounded-full equalizer-bar-1" />
                        <span className="w-1 bg-zinc-300 rounded-full equalizer-bar-2" />
                        <span className="w-1 bg-white rounded-full equalizer-bar-3" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Center: Full Song Title & Metadata (Maximum Width) */}
                <div className="min-w-0 flex-1 pr-3">
                  <h3
                    className={`text-sm font-semibold leading-snug break-words ${
                      isCurrent ? 'text-white' : 'text-zinc-100'
                    }`}
                  >
                    {song.title}
                  </h3>
                  
                  {/* Subtle Subtitle: Duration + Offline Indicator */}
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                    {song.duration > 0 && (
                      <span className="font-mono text-zinc-400">
                        {formatTime(song.duration)}
                      </span>
                    )}
                    {isOffline && (
                      <span className="flex items-center text-[11px] text-zinc-400 font-medium">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-zinc-300" />
                        Downloaded
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Only the Play/Pause Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSong(song);
                  }}
                  className={`p-2.5 rounded-full transition-all shrink-0 ${
                    isCurrentPlaying
                      ? 'bg-white text-black font-bold shadow-lg shadow-white/10 scale-105'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-white hover:text-black'
                  }`}
                  aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
                >
                  {isCurrentPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
