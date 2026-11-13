import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Song, RepeatMode } from '../types';
import { fetchAllSongs } from '../services/storage';
import {
  getOfflineSongIds,
  cacheSongOffline,
  removeSongFromCache,
  cacheAllSongsOffline,
  cleanPartialAudioCache
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
  const transitionTimerRef = useRef<number | null>(null);
  const pendingRetryCleanupRef = useRef<(() => void) | null>(null);
  const endedFallbackTimerRef = useRef<number | null>(null);
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);

  const pickRandomIndex = (length: number, excludeIdx: number): number => {
    if (length <= 1) return 0;
    let idx = Math.floor(Math.random() * length);
    if (idx === excludeIdx) {
      idx = (idx + 1) % length;
    }
    return idx;
  };

  const clearPendingRetry = () => {
    if (pendingRetryCleanupRef.current) {
      pendingRetryCleanupRef.current();
      pendingRetryCleanupRef.current = null;
    }
  };

  const beginTransition = () => {
    isTransitioningRef.current = true;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      isTransitioningRef.current = false;
      transitionTimerRef.current = null;
    }, 2000);
  };

  const endTransition = () => {
    isTransitioningRef.current = false;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

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

    clearPendingRetry();
    if (endedFallbackTimerRef.current !== null) {
      window.clearTimeout(endedFallbackTimerRef.current);
      endedFallbackTimerRef.current = null;
    }

    // Protect against transient 'pause' event emitted when swapping audio.src
    beginTransition();
    currentSongRef.current = song;
    setCurrentSong(song);
    setIsBuffering(true);
    setCurrentTime(0);

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

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsBuffering(false);
          endTransition();
        })
        .catch((err) => {
          console.warn('Playback play() error:', err);
          if (err?.name === 'AbortError') {
            // Interrupted by a newer play request; let the newer request own state
            return;
          }
          setIsBuffering(false);

          const attemptRetryPlay = () => {
            clearPendingRetry();
            if (currentSongRef.current?.id !== song.id) return;
            audio.play().then(() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
              setIsBuffering(false);
              endTransition();
            }).catch((retryErr) => {
              console.warn('Retry play() failed:', retryErr);
              setIsPlaying(false);
              isPlayingRef.current = false;
              endTransition();
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
              }
            });
          };

          if (audio.readyState >= 3) {
            attemptRetryPlay();
          } else {
            const onCanPlayRetry = () => attemptRetryPlay();
            audio.addEventListener('canplay', onCanPlayRetry);
            pendingRetryCleanupRef.current = () => {
              audio.removeEventListener('canplay', onCanPlayRetry);
            };
          }
        });
    } else {
      endTransition();
    }
  };

  // Initialize offline list & purge any stale partial 206 cache entries
  useEffect(() => {
    setOfflineIds(getOfflineSongIds());
    cleanPartialAudioCache();
  }, []);

  // Initialize Audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTrackEnded = () => {
      if (endedFallbackTimerRef.current !== null) {
        window.clearTimeout(endedFallbackTimerRef.current);
        endedFallbackTimerRef.current = null;
      }
      beginTransition();
      const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
      if (list.length === 0) {
        endTransition();
        return;
      }

      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().then(() => endTransition()).catch((err) => {
          console.warn('Repeat one play() error:', err);
          endTransition();
        });
        return;
      }

      const current = currentSongRef.current;
      const currentIdx = current ? list.findIndex(s => s.id === current.id) : -1;

      let nextIndex = 0;
      if (isShuffleRef.current) {
        nextIndex = pickRandomIndex(list.length, currentIdx);
      } else {
        if (repeatModeRef.current === 'off' && currentIdx >= list.length - 1) {
          // Reached end of playlist with repeat disabled
          setIsPlaying(false);
          isPlayingRef.current = false;
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
          }
          endTransition();
          return;
        }
        nextIndex = (currentIdx + 1) % list.length;
      }

      const nextTrack = list[nextIndex];
      if (nextTrack) {
        playTrackInternal(nextTrack);
      } else {
        endTransition();
      }
    };

    const onPlay = () => {
      if (endedFallbackTimerRef.current !== null) {
        window.clearTimeout(endedFallbackTimerRef.current);
        endedFallbackTimerRef.current = null;
      }
      endTransition();
      setIsPlaying(true);
      isPlayingRef.current = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      // If the audio track ended naturally, ensure track advance runs even if a mobile browser drops 'ended'
      if (audio.ended && !isTransitioningRef.current) {
        if (endedFallbackTimerRef.current === null) {
          endedFallbackTimerRef.current = window.setTimeout(() => {
            endedFallbackTimerRef.current = null;
            if (audio.ended && !isTransitioningRef.current) {
              handleTrackEnded();
            }
          }, 250);
        }
        return;
      }

      // If we are transitioning to the next track, DO NOT set playbackState to 'paused' on mobile OS!
      if (isTransitioningRef.current) {
        return;
      }
      setIsPlaying(false);
      isPlayingRef.current = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const onEnded = () => {
      handleTrackEnded();
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
      clearPendingRetry();
      if (endedFallbackTimerRef.current !== null) {
        window.clearTimeout(endedFallbackTimerRef.current);
        endedFallbackTimerRef.current = null;
      }
      endTransition();
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
      clearPendingRetry();
      if (endedFallbackTimerRef.current !== null) {
        window.clearTimeout(endedFallbackTimerRef.current);
        endedFallbackTimerRef.current = null;
      }
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
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

  const resumeOrReloadTrack = useCallback((song: Song) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If the media element has not loaded yet, errored, or already ended, reload cleanly
    if (!audio.src || audio.error || audio.readyState === 0 || audio.ended) {
      playTrackInternal(song);
      return;
    }

    beginTransition();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsBuffering(false);
          endTransition();
        })
        .catch((err) => {
          console.warn('Resume play() error, reloading track:', err);
          if (err?.name === 'AbortError') return;
          playTrackInternal(song);
        });
    } else {
      endTransition();
    }
  }, []);

  // Play a specific song (offline-aware, synchronous to prevent mobile autoplay pause)
  const playSong = useCallback((song: Song, customQueue?: Song[]) => {
    if (customQueue && customQueue.length > 0) {
      queueRef.current = customQueue;
    }

    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (currentSongRef.current?.id === song.id) {
      if (audio.paused || audio.ended || !isPlayingRef.current) {
        resumeOrReloadTrack(song);
      } else {
        audio.pause();
      }
      return;
    }

    playTrackInternal(song);
  }, [resumeOrReloadTrack]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    const current = currentSongRef.current;
    if (!current) {
      if (list.length > 0) {
        playSong(list[0]);
      }
      return;
    }
    if (audioRef.current.paused || audioRef.current.ended || !isPlayingRef.current) {
      resumeOrReloadTrack(current);
    } else {
      audioRef.current.pause();
    }
  }, [playSong, resumeOrReloadTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const current = currentSongRef.current;
    if (current) {
      resumeOrReloadTrack(current);
      return;
    }
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (list.length > 0) {
      playTrackInternal(list[0]);
    }
  }, [resumeOrReloadTrack]);

  // Next / Previous logic
  const nextSong = useCallback(() => {
    const list = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (list.length === 0) return;

    const current = currentSongRef.current;
    const currentIdx = current ? list.findIndex(s => s.id === current.id) : -1;

    if (isShuffleRef.current) {
      playTrackInternal(list[pickRandomIndex(list.length, currentIdx)]);
      return;
    }

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
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(time, isFinite(audio.duration) ? audio.duration : time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
    if (
      'mediaSession' in navigator &&
      navigator.mediaSession.setPositionState &&
      isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate || 1,
          position: clamped
        });
      } catch {
        // ignore
      }
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

  // Update MediaSession metadata only when the active song changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
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
  }, [currentSong]);

  // Register MediaSession action handlers once (no currentTime thrashing on mobile background playback)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        const offset = details.seekOffset || 10;
        seekTo(Math.max(audio.currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        const offset = details.seekOffset || 10;
        const maxDur = isFinite(audio.duration) ? audio.duration : audio.currentTime + offset;
        seekTo(Math.min(audio.currentTime + offset, maxDur));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession handler error:', err);
    }
  }, [resume, pause, prevSong, nextSong, seekTo]);

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
