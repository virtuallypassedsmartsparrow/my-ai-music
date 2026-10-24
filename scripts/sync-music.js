import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.resolve(__dirname, '../public/audio');
const songsJsonPath = path.resolve(__dirname, '../public/songs.json');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Helper to calculate MP3 duration from file size and frame bitrate
function estimateMp3Duration(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

    for (let i = 0; i < buffer.length - 4; i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        const version = (buffer[i + 1] >> 3) & 0x3;
        const layer = (buffer[i + 1] >> 1) & 0x3;
        const bitrateIdx = (buffer[i + 2] >> 4) & 0xf;

        if (version === 3 && layer === 1 && bitrateIdx > 0 && bitrateIdx < 15) {
          const kbps = bitrates[bitrateIdx];
          const dur = (size * 8) / (kbps * 1000);
          return Math.round(dur);
        }
      }
    }
    // Default estimate assuming 192 kbps
    return Math.round((size * 8) / (192 * 1000));
  } catch {
    return 0;
  }
}

// Read existing songs.json to preserve any custom edits
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

console.log(`Scanning public/audio: found ${validFiles.length} file(s)`);

const songs = validFiles.map((file, idx) => {
  const ext = path.extname(file);
  const basename = path.basename(file, ext);
  const url = `/audio/${encodeURIComponent(file)}`;
  const filePath = path.join(audioDir, file);
  const stats = fs.statSync(filePath);

  // Clean title from filename
  const cleanedTitle = basename
    .replace(/^\d+[\s._-]+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const existing = existingMap.get(url);
  const duration = existing?.duration > 0 ? existing.duration : estimateMp3Duration(filePath);

  return {
    id: existing?.id || `track-${idx + 1}-${Date.now().toString(36)}`,
    title: existing?.title || cleanedTitle || file,
    artist: existing?.artist || 'AI Music',
    album: existing?.album || 'AI Collection',
    url: url,
    coverUrl: existing?.coverUrl || '',
    duration: duration,
    createdAt: existing?.createdAt || stats.mtime.toISOString()
  };
});

fs.writeFileSync(songsJsonPath, JSON.stringify(songs, null, 2), 'utf8');
console.log(`Updated public/songs.json with ${songs.length} track(s)!`);
