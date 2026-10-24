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

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setUploadError(null);

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/^\d+[\s._-]+/, '')
      .replace(/[-_]/g, ' ')
      .trim();

    if (!title) {
      setTitle(cleanTitle);
    }

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
      setUploadError('Please choose an MP3/audio file.');
      return;
    }
    if (!title.trim()) {
      setUploadError('Please provide a track title.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading audio file...');
    setUploadError(null);

    try {
      let finalAudioUrl = '';
      let finalCoverUrl = '';

      const isSupabaseConfigured = Boolean(getSupabase());

      if (isSupabaseConfigured) {
        setUploadStatus('Uploading track to cloud storage...');
        finalAudioUrl = await uploadFileToSupabase(audioFile, 'tracks');

        if (coverFile) {
          setUploadStatus('Uploading cover artwork...');
          finalCoverUrl = await uploadFileToSupabase(coverFile, 'covers');
        }
      } else {
        finalAudioUrl = URL.createObjectURL(audioFile);
        if (coverFile) {
          finalCoverUrl = URL.createObjectURL(coverFile);
        }
      }

      const newSong: Song = {
        id: `song-${Date.now()}`,
        title: title.trim(),
        artist: artist.trim() || 'AI Music',
        url: finalAudioUrl,
        coverUrl: finalCoverUrl || undefined,
        duration: Math.round(detectedDuration) || 0,
        createdAt: new Date().toISOString()
      };

      setUploadStatus('Adding track to library...');
      await addSong(newSong);
      await refreshSongList();

      setUploadStatus('Song published successfully! 🎉');
      setAudioFile(null);
      setCoverFile(null);
      setTitle('');
      setDetectedDuration(0);

      setTimeout(() => {
        setUploadStatus(null);
        setActiveTab('manage');
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload song');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSong = async (id: string, songTitle: string) => {
    if (confirm(`Delete "${songTitle}" from the library?`)) {
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
          message: `Connected, but table check failed: ${error.message}`
        });
      } else {
        setTestResult({ success: true, message: 'Connected to Supabase successfully! Ready to stream.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection failed: ${err.message}` });
    }
  };

  const supabaseSqlSchema = `-- Run in Supabase SQL Editor:
create table if not exists songs (
  id text primary key,
  title text not null,
  artist text default 'AI Music',
  album text,
  url text not null,
  cover_url text,
  duration integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#070709]">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">Creator Studio & Admin</h3>
          </div>
          <button
            onClick={() => setAdminOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Screen */}
        {!isAuthenticated ? (
          <form onSubmit={handlePinSubmit} className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 text-white border border-zinc-700 flex items-center justify-center mx-auto shadow-md">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Admin Authentication</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your Admin PIN to upload new songs or adjust cloud settings. (Default PIN: <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">1234</code>)
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                className="w-full text-center text-xl tracking-widest py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-zinc-400"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-white" /> Incorrect PIN. Try 1234.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full max-w-xs py-2.5 rounded-xl bg-white hover:bg-zinc-200 font-bold text-sm text-black transition-all shadow-md"
            >
              Unlock Creator Studio
            </button>
          </form>
        ) : (
          /* Authenticated Admin Tabs */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800 bg-[#070709] px-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'upload'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Song</span>
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'manage'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Manage Tracks ({songs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'settings'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
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
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Audio File (MP3 / WAV) *
                    </label>
                    <label className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-400 bg-zinc-900/60 cursor-pointer transition-all">
                      <Music className="w-8 h-8 text-zinc-400 mb-1" />
                      <span className="text-xs font-medium text-zinc-200">
                        {audioFile ? audioFile.name : 'Choose your AI track file'}
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5">
                        {audioFile
                          ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB • ${Math.round(detectedDuration)}s detected`
                          : 'Supports MP3 and WAV'}
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Cover Artwork (Optional)
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 cursor-pointer hover:border-zinc-700">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-300 truncate">
                          {coverFile ? coverFile.name : 'Choose album cover image'}
                        </p>
                        <p className="text-[11px] text-zinc-500">JPG, PNG, or WebP</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Song Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Song Title"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Artist Name
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Artist Handle"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  {uploadStatus && (
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{uploadStatus}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-zinc-900 border border-red-500/50 text-xs text-zinc-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
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
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <p className="text-xs text-zinc-400">
                      Total: <span className="font-semibold text-white">{songs.length} tracks</span>
                    </p>
                    <button
                      onClick={() => exportSongsToJson(songs)}
                      className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                      title="Export songs.json"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export songs.json</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                      >
                        <div className="min-w-0 pr-2 flex-1">
                          <p className="font-bold text-white truncate">{song.title}</p>
                          <p className="text-zinc-400 text-[11px] truncate">
                            {song.artist || 'AI Music'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSong(song.id, song.title)}
                          className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 space-y-1.5">
                    <p className="font-bold text-white flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                      Free 1GB Supabase Setup (Stream to All Friends)
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      1. Create a free account at{' '}
                      <a
                        href="https://supabase.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-white underline inline-flex items-center"
                      >
                        supabase.com <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                      <br />
                      2. Create a public storage bucket named <code className="text-white">music</code>.
                      <br />
                      3. Run the SQL script below in the Supabase SQL Editor.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-300 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={settings.supabaseUrl}
                      onChange={(e) =>
                        setSettingsState({ ...settings, supabaseUrl: e.target.value })
                      }
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-300 mb-1">
                      Supabase Anon Public API Key
                    </label>
                    <input
                      type="password"
                      value={settings.supabaseAnonKey}
                      onChange={(e) =>
                        setSettingsState({ ...settings, supabaseAnonKey: e.target.value })
                      }
                      placeholder="eyJhbGciOi..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-300 mb-1">
                      Admin PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={settings.adminPin}
                      onChange={(e) =>
                        setSettingsState({ ...settings, adminPin: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={copySqlToClipboard}
                      className="w-full py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL Setup'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                        testResult.success
                          ? 'bg-zinc-900 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-red-500/50 text-zinc-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
                    >
                      Test Connection
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-lg bg-white text-black font-bold shadow-md hover:bg-zinc-200"
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
