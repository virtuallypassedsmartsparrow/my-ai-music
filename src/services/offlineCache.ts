const CACHE_NAME = 'ai-music-offline-v1';
const OFFLINE_INDEX_KEY = 'ai_music_offline_ids';

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

/**
 * Checks if a song is downloaded for offline playback
 */
export async function isSongOffline(songId: string): Promise<boolean> {
  const ids = getOfflineSongIds();
  return ids.includes(songId);
}

/**
 * Downloads a single song to the phone's offline cache
 */
export async function cacheSongOffline(song: { id: string; url: string }): Promise<void> {
  if (!('caches' in window)) {
    throw new Error('Offline storage is not supported in this browser.');
  }

  const cache = await caches.open(CACHE_NAME);
  // Fetch the audio and store in cache
  const response = await fetch(song.url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to download audio track (${response.status})`);
  }
  await cache.put(song.url, response);

  const ids = getOfflineSongIds();
  if (!ids.includes(song.id)) {
    ids.push(song.id);
    setOfflineSongIds(ids);
  }
}

/**
 * Removes a song from offline cache
 */
export async function removeSongFromCache(song: { id: string; url: string }): Promise<void> {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(song.url);
  }
  const ids = getOfflineSongIds().filter(id => id !== song.id);
  setOfflineSongIds(ids);
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
 * Downloads all songs for offline listening (e.g. before getting on a plane / to save cell data)
 */
export async function cacheAllSongsOffline(
  songs: { id: string; url: string }[],
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
}
