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
  Calendar
} from 'lucide-react';

export const SongList: React.FC = () => {
  const { songs, currentSong, isPlaying, playSong } = usePlayer();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'duration'>('newest');

  // Compute genres dynamically
  const genres = useMemo(() => {
    const set = new Set<string>();
    songs.forEach(s => {
      if (s.genre) set.add(s.genre);
    });
    return ['All', ...Array.from(set)];
  }, [songs]);

  // Filter and sort
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.genre && s.genre.toLowerCase().includes(q))
      );
    }

    // Genre filter
    if (selectedGenre !== 'All') {
      result = result.filter(s => s.genre === selectedGenre);
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
  }, [songs, searchTerm, selectedGenre, sortBy]);

  const handleShare = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Listen to "${song.title}" by ${song.artist} on AI Beats!`,
          url: window.location.href
        });
      } catch {
        // user cancelled share
      }
    } else {
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = song.url;
    link.download = `${song.artist} - ${song.title}.mp3`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-36">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, artist, or genre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
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

      {/* Genre Filter Tabs & Sort Control */}
      <div className="flex items-center justify-between gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {/* Genre pills */}
        <div className="flex items-center space-x-1.5 flex-nowrap">
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedGenre === genre
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-semibold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center shrink-0">
          <label className="sr-only">Sort by</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg pl-6 pr-6 py-1.5 focus:outline-none focus:border-violet-500"
            >
              <option value="newest">Newest</option>
              <option value="title">A-Z</option>
              <option value="duration">Length</option>
            </select>
            <ArrowUpDown className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800/60 my-4">
          <Music2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300 mb-1">No songs found</p>
          <p className="text-xs text-slate-500">
            {searchTerm ? 'Try a different search keyword.' : 'Upload your first AI track using the lock icon in the top right.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSongs.map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isCurrentPlaying = isCurrent && isPlaying;

            return (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-gradient-to-r from-violet-950/40 via-slate-900/90 to-indigo-950/30 border-violet-500/50 shadow-lg shadow-violet-950/20'
                    : 'bg-slate-900/60 border-slate-850 hover:bg-slate-800/60 border-slate-800/40'
                }`}
              >
                {/* Left: Thumbnail & Song Info */}
                <div className="flex items-center space-x-3 min-w-0 pr-2 flex-1">
                  {/* Track Number / Equalizer / Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700/50">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-800 to-indigo-900 flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-violet-300/80" />
                      </div>
                    )}

                    {/* Overlay Play State */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <div className="flex items-end space-x-0.5 h-4">
                          <span className="w-1 bg-violet-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-3"></span>
                          <span className="w-1 bg-violet-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-4"></span>
                          <span className="w-1 bg-violet-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite] h-2"></span>
                        </div>
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <h3
                        className={`text-sm font-semibold truncate ${
                          isCurrent ? 'text-violet-300' : 'text-slate-100'
                        }`}
                      >
                        {song.title}
                      </h3>
                      {song.genre && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                          {song.genre}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-slate-400 space-x-2 mt-0.5">
                      <span className="truncate">{song.artist}</span>
                      {song.createdAt && (
                        <>
                          <span className="text-slate-600">•</span>
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
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs font-mono text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-500" />
                    {formatTime(song.duration)}
                  </span>

                  {/* Share button */}
                  <button
                    onClick={(e) => handleShare(e, song)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Share song"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Download button */}
                  <button
                    onClick={(e) => handleDownload(e, song)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Download MP3"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Play/Pause Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playSong(song);
                    }}
                    className={`p-2 rounded-full transition-all ${
                      isCurrentPlaying
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/40'
                        : 'bg-slate-800 text-slate-200 hover:bg-violet-600 hover:text-white'
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
