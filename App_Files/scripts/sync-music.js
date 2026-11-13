import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.resolve(__dirname, '../public/audio');
const addMusicDir = path.resolve(__dirname, '../../Add_Music');
const songsJsonPath = path.resolve(__dirname, '../public/songs.json');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 1. Sync from Add_Music folder if present
const audioExtensions = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac']);

if (fs.existsSync(addMusicDir)) {
  try {
    const addMusicFiles = fs.readdirSync(addMusicDir);
    let copiedCount = 0;
    for (const file of addMusicFiles) {
      const ext = path.extname(file).toLowerCase();
      if (!audioExtensions.has(ext)) continue;

      const sourceFile = path.join(addMusicDir, file);
      const destFile = path.join(audioDir, file);

      let needCopy = false;
      if (!fs.existsSync(destFile)) {
        needCopy = true;
      } else {
        const srcStat = fs.statSync(sourceFile);
        const dstStat = fs.statSync(destFile);
        if (srcStat.size !== dstStat.size) {
          needCopy = true;
        }
      }

      if (needCopy) {
        fs.copyFileSync(sourceFile, destFile);
        copiedCount++;
      }
    }
    if (copiedCount > 0) {
      console.log(`Synced ${copiedCount} new/updated song(s) from Add_Music to App_Files/public/audio`);
    }
  } catch (err) {
    console.warn('Warning syncing Add_Music folder:', err.message);
  }
}

// Accurate MPEG Audio frame parser with Xing / Info / VBRI header support
const sampleRates = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000]   // MPEG 2.5
};

const bitratesMPEG1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

function estimateMp3Duration(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const fd = fs.openSync(filePath, 'r');
    const bufSize = Math.min(size, 65536);
    const buffer = Buffer.alloc(bufSize);
    fs.readSync(fd, buffer, 0, bufSize, 0);
    fs.closeSync(fd);

    // Skip ID3v2 header if present so we start at actual MPEG frames
    let offset = 0;
    if (buffer.toString('utf8', 0, 3) === 'ID3') {
      const tagSize = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
      offset = tagSize + 10;
    }

    for (let i = offset; i < buffer.length - 4; i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        const version = (buffer[i + 1] >> 3) & 0x3;
        const layer = (buffer[i + 1] >> 1) & 0x3;
        const bitrateIdx = (buffer[i + 2] >> 4) & 0xf;
        const srIdx = (buffer[i + 2] >> 2) & 0x3;

        if (version === 3 && layer === 1 && bitrateIdx > 0 && bitrateIdx < 15 && srIdx < 3) {
          const sampleRate = sampleRates[version][srIdx];
          const frameChunk = buffer.subarray(i, Math.min(i + 250, buffer.length));
          const str = frameChunk.toString('latin1');

          // 1. Check for Xing or Info header (used by LAME and modern encoders for VBR/CBR total frame count)
          let xingIdx = str.indexOf('Xing');
          if (xingIdx === -1) xingIdx = str.indexOf('Info');
          if (xingIdx !== -1 && xingIdx + 12 <= frameChunk.length) {
            const flags = frameChunk.readUInt32BE(xingIdx + 4);
            if (flags & 0x1) { // Frames flag is present
              const frames = frameChunk.readUInt32BE(xingIdx + 8);
              if (frames > 0) {
                return Math.round((frames * 1152) / sampleRate);
              }
            }
          }

          // 2. Check for Fraunhofer VBRI header
          let vbriIdx = str.indexOf('VBRI');
          if (vbriIdx !== -1 && vbriIdx + 18 <= frameChunk.length) {
            const frames = frameChunk.readUInt32BE(vbriIdx + 14);
            if (frames > 0) {
              return Math.round((frames * 1152) / sampleRate);
            }
          }

          // 3. Fallback to CBR bitrate estimation using pure audio payload size
          const kbps = bitratesMPEG1Layer3[bitrateIdx];
          const audioBytes = Math.max(size - offset, 0);
          return Math.round((audioBytes * 8) / (kbps * 1000));
        }
      }
    }
    // Default fallback assuming 192 kbps
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
  const calculatedDuration = estimateMp3Duration(filePath);
  const duration = calculatedDuration > 0 ? calculatedDuration : (existing?.duration || 0);

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
