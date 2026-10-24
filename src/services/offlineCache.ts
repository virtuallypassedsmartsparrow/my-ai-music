import type { Song } from '../types';

const CACHE_NAME = 'ai-music-offline-v1';
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
 * Downloads a single song and its audio to the phone's offline cache
 */
export async function cacheSongOffline(song: Song): Promise<void> {
  if (!('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(song.url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to download audio track (${response.status})`);
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
 * Gets the playable URL (cached blob URL if available, else original URL)
 */
export async function getPlayableAudioUrl(url: string): Promise<string> {
  if (!('caches' in window)) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Failed to retrieve from offline cache:', err);
  }
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
