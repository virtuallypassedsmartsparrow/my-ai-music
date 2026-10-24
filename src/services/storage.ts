import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Song, CloudSettings } from '../types';

const SETTINGS_KEY = 'ai_music_cloud_settings';
const CUSTOM_SONGS_KEY = 'ai_music_custom_songs';

export const DEFAULT_SETTINGS: CloudSettings = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  bucketName: 'music',
  adminPin: '1234',
  artistDefault: 'My AI Tracks'
};

export function getSettings(): CloudSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: CloudSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let cachedSupabase: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabase(): SupabaseClient | null {
  const settings = getSettings();
  if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
    return null;
  }
  if (cachedSupabase && lastUrl === settings.supabaseUrl && lastKey === settings.supabaseAnonKey) {
    return cachedSupabase;
  }
  try {
    cachedSupabase = createClient(settings.supabaseUrl, settings.supabaseAnonKey);
    lastUrl = settings.supabaseUrl;
    lastKey = settings.supabaseAnonKey;
    return cachedSupabase;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    return null;
  }
}

/**
 * Loads songs from Supabase if configured, or falls back to /songs.json + localStorage
 */
export async function fetchAllSongs(): Promise<Song[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          artist: item.artist,
          album: item.album || '',
          url: item.url,
          coverUrl: item.cover_url || item.coverUrl,
          duration: Number(item.duration) || 0,
          genre: item.genre || 'AI Music',
          createdAt: item.created_at || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local songs:', err);
    }
  }

  // Fallback: static songs.json + locally added songs
  let baseSongs: Song[] = [];
  try {
    const res = await fetch(`/songs.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      baseSongs = await res.json();
    }
  } catch (e) {
    console.warn('Failed to load songs.json:', e);
  }

  try {
    const custom = localStorage.getItem(CUSTOM_SONGS_KEY);
    if (custom) {
      const parsed: Song[] = JSON.parse(custom);
      const baseUrls = new Set(baseSongs.map(s => s.url));
      const validCustom = parsed.filter(s => !baseUrls.has(s.url) && !s.url.includes('sample1.wav'));
      return [...baseSongs, ...validCustom];
    }
  } catch (e) {
    console.warn('Failed to read custom songs from localStorage:', e);
  }

  return baseSongs;
}

/**
 * Saves a new song to Supabase or localStorage
 */
export async function addSong(song: Song): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('songs').insert([
      {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        url: song.url,
        cover_url: song.coverUrl,
        duration: Math.round(song.duration),
        genre: song.genre,
        created_at: song.createdAt
      }
    ]);
    if (error) throw new Error(error.message);
    return;
  }

  // Local storage fallback
  const custom = localStorage.getItem(CUSTOM_SONGS_KEY);
  let parsed: Song[] = custom ? JSON.parse(custom) : [];
  parsed = [song, ...parsed.filter(s => s.id !== song.id)];
  localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(parsed));
}

/**
 * Deletes a song by id
 */
export async function deleteSongById(id: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  // Remove from localStorage
  const custom = localStorage.getItem(CUSTOM_SONGS_KEY);
  if (custom) {
    const parsed: Song[] = JSON.parse(custom);
    const updated = parsed.filter(s => s.id !== id);
    localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(updated));
  }
}

/**
 * Uploads an audio or image file to Supabase storage bucket
 */
export async function uploadFileToSupabase(
  file: File,
  folder: 'tracks' | 'covers' = 'tracks'
): Promise<string> {
  const supabase = getSupabase();
  const settings = getSettings();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please enter your Supabase URL & Anon Key in Settings.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${folder}/${Date.now()}_${cleanName}`;

  const { error } = await supabase.storage
    .from(settings.bucketName || 'music')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: pubData } = supabase.storage
    .from(settings.bucketName || 'music')
    .getPublicUrl(path);

  return pubData.publicUrl;
}

/**
 * Detects duration from an audio file using HTML5 Audio
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.remove();
    };

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      cleanup();
      resolve(isFinite(dur) ? dur : 0);
    };

    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
  });
}

/**
 * Exports current songs to songs.json and triggers browser download
 */
export function exportSongsToJson(songs: Song[]) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(songs, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute('href', dataStr);
  dlAnchorElem.setAttribute('download', 'songs.json');
  dlAnchorElem.click();
  dlAnchorElem.remove();
}
