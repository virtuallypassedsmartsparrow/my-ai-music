import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.resolve(__dirname, '../public/audio');
const songsJsonPath = path.resolve(__dirname, '../public/songs.json');

// Ensure public/audio directory exists
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Read existing songs.json to preserve any custom cover art, etc.
let existingSongs = [];
if (fs.existsSync(songsJsonPath)) {
  try {
    existingSongs = JSON.parse(fs.readFileSync(songsJsonPath, 'utf8'));
  } catch (err) {
    existingSongs = [];
  }
}
const existingMap = new Map(existingSongs.map(s => [s.url, s]));

// Scan audio directory
const audioExtensions = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac']);
const files = fs.readdirSync(audioDir);

const validFiles = files.filter(file => {
  const ext = path.extname(file).toLowerCase();
  return audioExtensions.has(ext);
});

console.log(`Found ${validFiles.length} audio file(s) in public/audio/`);

if (validFiles.length === 0) {
  console.log('No audio files found. Drop your .mp3 files into public/audio/ and run npm run sync!');
} else {
  const songs = validFiles.map((file, idx) => {
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const url = `/audio/${encodeURIComponent(file)}`;
    const stats = fs.statSync(path.join(audioDir, file));

    // Clean title from filename: "01_My_Cool_Song.mp3" -> "My Cool Song"
    const cleanedTitle = basename
      .replace(/^\d+[\s._-]+/, '') // remove leading track numbers like 01- or 01.
      .replace(/[-_]+/g, ' ')      // replace underscores and dashes with spaces
      .replace(/\s+/g, ' ')
      .trim();

    const existing = existingMap.get(url);

    return {
      id: existing?.id || `track-${idx + 1}-${Date.now().toString(36)}`,
      title: existing?.title || cleanedTitle || file,
      artist: existing?.artist || 'AI Music',
      album: existing?.album || 'AI Collection',
      url: url,
      coverUrl: existing?.coverUrl || '',
      duration: existing?.duration || 0,
      createdAt: existing?.createdAt || stats.mtime.toISOString()
    };
  });

  fs.writeFileSync(songsJsonPath, JSON.stringify(songs, null, 2), 'utf8');
  console.log(`Successfully updated public/songs.json with ${songs.length} song(s)!`);
}
