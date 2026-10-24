export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url: string;        // mp3 or wav audio stream URL
  coverUrl?: string;  // artwork image URL
  duration: number;   // in seconds
  genre?: string;
  createdAt: string;  // ISO string
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface CloudSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
  adminPin: string;
  artistDefault: string;
}
