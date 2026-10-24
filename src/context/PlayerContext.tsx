import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Song, RepeatMode } from '../types';
import { fetchAllSongs } from '../services/storage';

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
  
  // Actions
  playSong: (song: Song) => void;
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
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  
  // Modals & UI states
  const [isFullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isInstallOpen, setInstallOpen] = useState(false);
  
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
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
          // ignore position state sync errors
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
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
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

  // Play a specific song
  const playSong = useCallback((song: Song) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (currentSong?.id === song.id) {
      // Toggle play/pause
      if (audio.paused) {
        audio.play().catch(console.warn);
      } else {
        audio.pause();
      }
      return;
    }

    setCurrentSong(song);
    audio.src = song.url;
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsBuffering(true);

    audio.play().catch((err) => {
      console.warn('Autoplay prevented or network error:', err);
      setIsBuffering(false);
      setIsPlaying(false);
    });
  }, [currentSong]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [currentSong, songs, playSong]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.warn);
  }, []);

  // Next / Previous logic
  const nextSong = useCallback(() => {
    if (songs.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex]);
      return;
    }
    const nextIdx = (currentIndex + 1) % songs.length;
    playSong(songs[nextIdx]);
  }, [songs, isShuffle, currentIndex, playSong]);

  const prevSong = useCallback(() => {
    if (songs.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // Restart current song if already > 3 seconds in
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIdx]);
  }, [songs, currentIndex, playSong]);

  // Handle song ending according to repeat mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else if (repeatMode === 'all') {
        nextSong();
      } else {
        // 'off'
        if (currentIndex < songs.length - 1) {
          nextSong();
        } else {
          setIsPlaying(false);
        }
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeatMode, nextSong, currentIndex, songs.length]);

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

  // MediaSession API setup
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || 'AI Beats',
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
    }

    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        seekTo(details.seekTime);
      }
    });

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [currentSong, resume, pause, prevSong, nextSong, seekTo]);

  // Prompt PWA install
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
        promptPwaInstall
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
