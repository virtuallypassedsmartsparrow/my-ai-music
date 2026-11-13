import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Song, RepeatMode } from '../types';
import { fetchAllSongs } from '../services/storage';
import {
  getOfflineSongIds,
  cacheSongOffline,
  removeSongFromCache,
  cacheAllSongsOffline
} from '../services/offlineCache';

interface PlayerContextType {
  songs: Song[];
  currentSong: Song | null;
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isFullPlayerOpen: boolean;
  isAdminOpen: boolean;
  isInstallOpen: boolean;
  canInstallPwa: boolean;
  isStandalone: boolean;
  offlineIds: string[];
  offlineProgress: { isDownloading: boolean; completed: number; total: number };
  
  // Actions
  playSong: (song: Song, customQueue?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setFullPlayerOpen: (open: boolean) => void;
  setAdminOpen: (open: boolean) => void;
  setInstallOpen: (open: boolean) => void;
  refreshSongList: () => Promise<void>;
  promptPwaInstall: () => Promise<void>;
  toggleSongOffline: (song: Song) => Promise<void>;
  downloadAllForOffline: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  
  // Offline State
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [offlineProgress, setOfflineProgress] = useState<{
    isDownloading: boolean;
    completed: number;
    total: number;
  }>({ isDownloading: false, completed: 0, total: 0 });

  // Modals & UI states
  const [isFullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isInstallOpen, setInstallOpen] = useState(false);
  
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronized refs to eliminate stale closure bugs during background audio transitions
  const songsRef = useRef<Song[]>([]);
  const queueRef = useRef<Song[]>([]);
  const currentSongRef = useRef<Song | null>(null);
  const isPlayingRef = useRef(false);
  const isShuffleRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>('all');
  const isTransitioningRef = useRef(false);
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);

  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Direct track play implementation that manages MediaSession and keeps mobile playback alive
  const playTrackInternal = (song: Song) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    currentSongRef.current = song;
    setCurrentSong(song);
    setIsBuffering(true);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist || 'AI Music',
        album: song.album || 'AI Collection',
        artwork: [
          {
            src: song.coverUrl || '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: song.coverUrl || '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    audio.src = song.url;
    audio.volume = isMutedRef.current ? 0 : volumeRef.current;
    audio.currentTime = 0;
    setCurrentTime(0);

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsBuffering(false);
        })
        .catch((err) => {
          console.warn('Playback play() error:', err);
          setIsBuffering(false);
          // If browser delayed decode, retry once when enough data is ready
          const onCanPlayRetry = () => {
            audio.removeEventListener('canplay', onCanPlayRetry);
            audio.play().then(() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
            }).catch(console.warn);
          };
          audio.addEventListener('canplay', onCanPlayRetry);
        });
    }
  };

  // Initialize offline list
  useEffect(() => {
    setOfflineIds(getOfflineSongIds());
  }, []);

  // Initialize Audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      // If the audio track ended naturally or is transitioning to the next track,
      // DO NOT set playbackState to 'paused' on mobile OS, otherwise mobile browsers
      // revoke background audio permissions before the next song begins!
      if (isTransitioningRef.current || audio.ended) {
        return;
      }
      setIsPlaying(false);
      isPlayingRef.current = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const onEnded = () => {
      isTransitioningRef.current = true;
      const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
      if (list.length === 0) {
        isTransitioningRef.current = false;
        return;
      }

      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 300);
        return;
      }

      const current = currentSongRef.current;
      const currentIdx = current ? list.findIndex(s => s.id === current.id) : -1;

      let nextIndex = 0;
      if (isShuffleRef.current) {
        nextIndex = Math.floor(Math.random() * list.length);
      } else {
        if (repeatModeRef.current === 'off' && currentIdx >= list.length - 1) {
          // Reached end of playlist with repeat disabled
          setIsPlaying(false);
          isPlayingRef.current = false;
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
          }
          isTransitioningRef.current = false;
          return;
        }
        nextIndex = (currentIdx + 1) % list.length;
      }

      const nextTrack = list[nextIndex];
      if (nextTrack) {
        playTrackInternal(nextTrack);
      }

      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 500);
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (
        'mediaSession' in navigator &&
        navigator.mediaSession.setPositionState &&
        isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration)
          });
        } catch {
          // ignore
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsBuffering(false);
    };

    const onError = (e: any) => {
      console.warn('Audio playback error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Listen for PWA beforeinstallprompt and check standalone mode
  useEffect(() => {
    const checkStandalone = () => {
      const isWindowStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      setIsStandalone(Boolean(isWindowStandalone || isNavStandalone));
    };
    checkStandalone();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Load songs on start
  const refreshSongList = useCallback(async () => {
    try {
      const list = await fetchAllSongs();
      setSongs(list);
    } catch (e) {
      console.error('Failed to fetch songs list:', e);
    }
  }, []);

  useEffect(() => {
    refreshSongList();
  }, [refreshSongList]);

  // Current index in list
  const currentIndex = currentSong ? songs.findIndex(s => s.id === currentSong.id) : -1;

  // Play a specific song (offline-aware, synchronous to prevent mobile autoplay pause)
  const playSong = useCallback((song: Song, customQueue?: Song[]) => {
    if (customQueue && customQueue.length > 0) {
      queueRef.current = customQueue;
    }

    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (currentSongRef.current?.id === song.id) {
      if (audio.paused) {
        audio.play().catch(console.warn);
      } else {
        audio.pause();
      }
      return;
    }

    playTrackInternal(song);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (!currentSongRef.current && list.length > 0) {
      playSong(list[0]);
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [playSong]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.warn);
  }, []);

  // Next / Previous logic
  const nextSong = useCallback(() => {
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (list.length === 0) return;

    if (isShuffleRef.current) {
      const randomIndex = Math.floor(Math.random() * list.length);
      playTrackInternal(list[randomIndex]);
      return;
    }

    const current = currentSongRef.current;
    const currentIdx = current ? list.findIndex(s => s.id === current.id) : -1;
    const nextIdx = (currentIdx + 1) % list.length;
    playTrackInternal(list[nextIdx]);
  }, []);

  const prevSong = useCallback(() => {
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (list.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const current = currentSongRef.current;
    const currentIdx = current ? list.findIndex(s => s.id === current.id) : -1;
    const prevIdx = (currentIdx - 1 + list.length) % list.length;
    playTrackInternal(list[prevIdx]);
  }, []);

  // Seek
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Volume
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Toggle offline cache for single song
  const toggleSongOffline = useCallback(async (song: Song) => {
    const isCached = offlineIds.includes(song.id);
    if (isCached) {
      await removeSongFromCache(song);
      setOfflineIds(prev => prev.filter(id => id !== song.id));
    } else {
      await cacheSongOffline(song);
      setOfflineIds(prev => [...prev, song.id]);
    }
  }, [offlineIds]);

  // Download all songs for offline listening
  const downloadAllForOffline = useCallback(async () => {
    if (songs.length === 0) return;
    setOfflineProgress({ isDownloading: true, completed: 0, total: songs.length });

    await cacheAllSongsOffline(songs, (done, total) => {
      setOfflineProgress({ isDownloading: true, completed: done, total });
    });

    setOfflineIds(getOfflineSongIds());
    setOfflineProgress({ isDownloading: false, completed: songs.length, total: songs.length });
  }, [songs]);

  // MediaSession API setup for lock screen and Windows taskbar / SMTC controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'AI Music',
        album: currentSong.album || 'AI Collection',
        artwork: [
          {
            src: currentSong.coverUrl || '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: currentSong.coverUrl || '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.max(currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.min(currentTime + offset, duration));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession handler error:', err);
    }
  }, [currentSong, isPlaying, currentTime, duration, resume, pause, prevSong, nextSong, seekTo]);

  const promptPwaInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setInstallOpen(true);
    }
  }, [deferredPrompt]);

  return (
    <PlayerContext.Provider
      value={{
        songs,
        currentSong,
        currentIndex,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        isFullPlayerOpen,
        isAdminOpen,
        isInstallOpen,
        canInstallPwa: Boolean(deferredPrompt) || !isStandalone,
        isStandalone,
        offlineIds,
        offlineProgress,
        playSong,
        togglePlay,
        pause,
        resume,
        nextSong,
        prevSong,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        setFullPlayerOpen,
        setAdminOpen,
        setInstallOpen,
        refreshSongList,
        promptPwaInstall,
        toggleSongOffline,
        downloadAllForOffline
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
