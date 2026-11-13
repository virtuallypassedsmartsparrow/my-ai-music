import type { Song } from '../types';

export const CACHE_NAME = 'ai-music-audio-cache';
const OFFLINE_INDEX_KEY = 'ai_music_offline_ids';
const OFFLINE_SONGS_KEY = 'ai_music_offline_songs_data';

export function getOfflineSongIds(): string[] {
  try {
    const raw = localStorage.getItem(OFFLINE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setOfflineSongIds(ids: string[]) {
  localStorage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(ids));
}

export function getOfflineSongsData(): Song[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SONGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineSongData(song: Song) {
  const current = getOfflineSongsData();
  const filtered = current.filter(s => s.id !== song.id);
  filtered.push(song);
  localStorage.setItem(OFFLINE_SONGS_KEY, JSON.stringify(filtered));
}

function removeOfflineSongData(songId: string) {
  const current = getOfflineSongsData();
  const filtered = current.filter(s => s.id !== songId);
  localStorage.setItem(OFFLINE_SONGS_KEY, JSON.stringify(filtered));
}

/**
 * Checks if a song is downloaded for offline playback
 */
export async function isSongOffline(songId: string): Promise<boolean> {
  const ids = getOfflineSongIds();
  return ids.includes(songId);
}

/**
 * Removes any broken HTTP 206 partial entries from Cache Storage so that
 * RangeRequestsPlugin only ever serves complete 200 OK cached tracks.
 */
export async function cleanPartialAudioCache(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    for (const req of keys) {
      const resp = await cache.match(req);
      if (resp && resp.status !== 200) {
        await cache.delete(req);
      }
    }
  } catch (err) {
    console.warn('Cache cleanup skipped:', err);
  }
}

/**
 * Downloads a single song and its audio to the phone's offline cache
 */
export async function cacheSongOffline(song: Song): Promise<void> {
  if (!('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(song.url, { mode: 'cors', cache: 'no-store' });
  if (response.status !== 200) {
    throw new Error(`Failed to download full audio track (${response.status})`);
  }
  await cache.put(song.url, response);

  // Save ID
  const ids = getOfflineSongIds();
  if (!ids.includes(song.id)) {
    ids.push(song.id);
    setOfflineSongIds(ids);
  }

  // Save full song metadata so playlist works with 0% internet
  saveOfflineSongData(song);
}

/**
 * Removes a song from offline cache
 */
export async function removeSongFromCache(song: Song): Promise<void> {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(song.url);
  }
  const ids = getOfflineSongIds().filter(id => id !== song.id);
  setOfflineSongIds(ids);
  removeOfflineSongData(song.id);
}

/**
 * Gets the playable URL.
 * The Service Worker natively caches and handles HTTP 206 byte-ranges
 * for song.url, so returning song.url directly provides smooth background playback
 * without the 0.5s pause/stall caused by Blob URLs on mobile devices.
 */
export async function getPlayableAudioUrl(url: string): Promise<string> {
  return url;
}

/**
 * Downloads all songs for offline listening
 */
export async function cacheAllSongsOffline(
  songs: Song[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  let count = 0;
  for (const song of songs) {
    try {
      await cacheSongOffline(song);
    } catch (err) {
      console.warn(`Could not cache ${song.url}:`, err);
    }
    count++;
    if (onProgress) {
      onProgress(count, songs.length);
    }
  }
}

/**
 * Clears all cached offline songs
 */
export async function clearAllOfflineCache(): Promise<void> {
  if ('caches' in window) {
    await caches.delete(CACHE_NAME);
  }
  localStorage.removeItem(OFFLINE_INDEX_KEY);
  localStorage.removeItem(OFFLINE_SONGS_KEY);
}
