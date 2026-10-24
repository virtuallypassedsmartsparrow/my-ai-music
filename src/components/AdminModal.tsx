import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  getSettings,
  saveSettings,
  addSong,
  deleteSongById,
  uploadFileToSupabase,
  getAudioDuration,
  exportSongsToJson,
  getSupabase
} from '../services/storage';
import type { Song, CloudSettings } from '../types';
import {
  X,
  Upload,
  Music,
  Image as ImageIcon,
  KeyRound,
  Database,
  ListMusic,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';

export const AdminModal: React.FC = () => {
  const { isAdminOpen, setAdminOpen, songs, refreshSongList } = usePlayer();
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'settings'>('upload');

  // Upload Form State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('AI Music');
  const [detectedDuration, setDetectedDuration] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Settings State
  const [settings, setSettingsState] = useState<CloudSettings>(getSettings());
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isAdminOpen) {
      setSettingsState(getSettings());
      setArtist(getSettings().artistDefault || 'My AI Tracks');
    }
  }, [isAdminOpen]);

  if (!isAdminOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === settings.adminPin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // When audio file is selected
  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setUploadError(null);

    // Auto extract title from filename
    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    if (!title) {
      setTitle(cleanTitle);
    }

    // Auto detect duration
    try {
      const dur = await getAudioDuration(file);
      setDetectedDuration(dur);
    } catch {
      setDetectedDuration(0);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setUploadError('Please select an audio file (MP3/WAV).');
      return;
    }
    if (!title.trim()) {
      setUploadError('Please enter a track title.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Processing upload...');
    setUploadError(null);

    try {
      let finalAudioUrl = '';
      let finalCoverUrl = '';

      const isSupabaseConfigured = Boolean(getSupabase());

      if (isSupabaseConfigured) {
        setUploadStatus('Uploading audio file to cloud storage...');
        finalAudioUrl = await uploadFileToSupabase(audioFile, 'tracks');

        if (coverFile) {
          setUploadStatus('Uploading cover artwork...');
          finalCoverUrl = await uploadFileToSupabase(coverFile, 'covers');
        }
      } else {
        // Fallback for local testing / JSON mode
        finalAudioUrl = URL.createObjectURL(audioFile);
        if (coverFile) {
          finalCoverUrl = URL.createObjectURL(coverFile);
        }
      }

      const newSong: Song = {
        id: `song-${Date.now()}`,
        title: title.trim(),
        artist: artist.trim() || 'AI Artist',
        album: album.trim() || undefined,
        url: finalAudioUrl,
        coverUrl: finalCoverUrl || undefined,
        duration: Math.round(detectedDuration) || 120,
        genre: genre.trim() || 'AI Music',
        createdAt: new Date().toISOString()
      };

      setUploadStatus('Saving track to library...');
      await addSong(newSong);
      await refreshSongList();

      setUploadStatus('Track added successfully! 🎉');
      setAudioFile(null);
      setCoverFile(null);
      setTitle('');
      setDetectedDuration(0);

      setTimeout(() => {
        setUploadStatus(null);
        setActiveTab('manage');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload song');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSong = async (id: string, songTitle: string) => {
    if (confirm(`Are you sure you want to delete "${songTitle}"?`)) {
      try {
        await deleteSongById(id);
        await refreshSongList();
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setTestResult({ success: true, message: 'Settings saved successfully!' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setTestResult({ message: 'Testing Supabase connection...' });
    try {
      const client = getSupabase();
      if (!client) {
        setTestResult({ success: false, message: 'Please provide both URL and Anon Key.' });
        return;
      }
      const { error } = await client.from('songs').select('id').limit(1);
      if (error) {
        setTestResult({
          success: false,
          message: `Connected, but table check failed: ${error.message}. Did you run the SQL script?`
        });
      } else {
        setTestResult({ success: true, message: 'Connected to Supabase successfully! Ready to stream.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection failed: ${err.message}` });
    }
  };

  const supabaseSqlSchema = `-- Run this in your Supabase SQL Editor:
create table if not exists songs (
  id text primary key,
  title text not null,
  artist text not null,
  album text,
  url text not null,
  cover_url text,
  duration integer default 0,
  genre text default 'AI Music',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable public read access so your friends can stream songs:
alter table songs enable row level security;
create policy "Allow public read" on songs for select using (true);
create policy "Allow admin insert" on songs for insert with check (true);
create policy "Allow admin delete" on songs for delete using (true);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(supabaseSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0e1320] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-bold text-white">Creator Studio & Admin</h3>
          </div>
          <button
            onClick={() => setAdminOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Screen */}
        {!isAuthenticated ? (
          <form onSubmit={handlePinSubmit} className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Admin Authentication</h4>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Admin PIN to upload new songs or adjust cloud settings. (Default PIN: <code className="text-violet-300">1234</code>)
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                className="w-full text-center text-xl tracking-widest py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-1 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Incorrect PIN. Try 1234.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full max-w-xs py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition-all shadow-md shadow-violet-600/30"
            >
              Unlock Creator Studio
            </button>
          </form>
        ) : (
          /* Authenticated Admin Tabs */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/60 px-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'upload'
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Song</span>
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'manage'
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Manage Tracks ({songs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'settings'
                    ? 'border-violet-500 text-violet-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Cloud Setup</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: UPLOAD */}
              {activeTab === 'upload' && (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* Audio File Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Audio File (MP3 / WAV / M4A) *
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500/80 bg-slate-900/50 cursor-pointer transition-all">
                      <Music className="w-7 h-7 text-violet-400 mb-1" />
                      <span className="text-xs font-medium text-slate-300">
                        {audioFile ? audioFile.name : 'Tap to select your AI song'}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {audioFile
                          ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB • ${Math.round(detectedDuration)}s detected`
                          : 'Supports up to 50MB per song'}
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Artwork Image */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cover Artwork (Optional)
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-300 truncate">
                          {coverFile ? coverFile.name : 'Choose album cover image'}
                        </p>
                        <p className="text-[11px] text-slate-500">JPG, PNG, or WebP</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Song Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Song Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Cyberpunk Symphony"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Artist Name
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Your Artist / AI Handle"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Genre / Tag
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. Synthwave, Lofi, EDM"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Album / Collection (Optional)
                      </label>
                      <input
                        type="text"
                        value={album}
                        onChange={(e) => setAlbum(e.target.value)}
                        placeholder="e.g. Synthetic Horizons Vol. 1"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Upload Status / Errors */}
                  {uploadStatus && (
                    <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/40 text-xs text-violet-200 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>{uploadStatus}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/30 flex items-center justify-center space-x-1.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Publish Song to App</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: MANAGE TRACKS */}
              {activeTab === 'manage' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <p className="text-xs text-slate-400">
                      Total: <span className="font-semibold text-white">{songs.length} tracks</span>
                    </p>
                    <button
                      onClick={() => exportSongsToJson(songs)}
                      className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                      title="Export songs.json for static hosting"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export songs.json</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                      >
                        <div className="min-w-0 pr-2 flex-1">
                          <p className="font-semibold text-white truncate">{song.title}</p>
                          <p className="text-slate-400 text-[11px] truncate">
                            {song.artist} • {song.genre}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSong(song.id, song.title)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete track"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CLOUD SETUP */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-slate-300 space-y-1.5">
                    <p className="font-semibold text-violet-300 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Free 1GB Supabase Setup (Stream Anywhere)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      1. Create a free account at{' '}
                      <a
                        href="https://supabase.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 underline inline-flex items-center"
                      >
                        supabase.com <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                      <br />
                      2. Create a bucket named <code className="text-violet-300">music</code> (mark it Public).
                      <br />
                      3. Run the SQL snippet below in the SQL Editor.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={settings.supabaseUrl}
                      onChange={(e) =>
                        setSettingsState({ ...settings, supabaseUrl: e.target.value })
                      }
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Supabase Anon Public API Key
                    </label>
                    <input
                      type="password"
                      value={settings.supabaseAnonKey}
                      onChange={(e) =>
                        setSettingsState({ ...settings, supabaseAnonKey: e.target.value })
                      }
                      placeholder="eyJhbGciOi..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Admin PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={settings.adminPin}
                      onChange={(e) =>
                        setSettingsState({ ...settings, adminPin: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>

                  {/* Copy SQL Schema Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={copySqlToClipboard}
                      className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-violet-500 text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedSql ? 'SQL Copied to Clipboard!' : 'Copy Supabase SQL Setup Script'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                        testResult.success
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                    >
                      Test Connection
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-md shadow-violet-600/30"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
