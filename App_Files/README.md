# 🎵 AI Beats - Personal AI Music Streaming App (PWA)

A mobile-first **Progressive Web App (PWA)** to stream your AI-generated music tracks with your friends. 

- **100% Free Forever**: Zero Apple Developer fees (\$99/yr avoided) and zero Google Play fees.
- **Cross-Platform**: Works smoothly on **Android, iPhone (iOS), iPad, Mac, and Windows**.
- **Native App Feel**: Friends can tap **"Add to Home Screen"** to install it like a real app (with custom app icon, full-screen playback, and lock-screen media controls).
- **Instant Updates**: Whenever you create a new AI song, upload it in 5 seconds via the Creator Studio—all your friends see the latest track immediately.

---

## ⚡ Quick Start (Local Preview)

To run and preview the player locally:

```bash
# 1. Install dependencies (already installed)
npm install

# 2. Start local dev server
npm run dev
```

Open `http://localhost:5173` in your browser. (You can also open Chrome DevTools, toggle Device Mode, and test on iPhone or Android viewports).

---

## 🚀 Two Ways to Add & Store Your AI Music

### Method 1: Free Cloud Streaming via Supabase (Recommended)

This allows you to upload new AI songs directly from your phone or browser anytime without touching code.

1. Create a free account at [supabase.com](https://supabase.com) (Free tier gives you **1 GB storage** + Postgres DB, enough for 100+ songs).
2. Create a new project.
3. In **Storage**, create a new bucket named `music` and toggle **Public Bucket: ON**.
4. In **SQL Editor**, paste and run this:
   ```sql
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

   alter table songs enable row level security;
   create policy "Allow public read" on songs for select using (true);
   create policy "Allow admin insert" on songs for insert with check (true);
   create policy "Allow admin delete" on songs for delete using (true);
   ```
5. In your app, tap the **Lock icon** in the top right:
   * Enter PIN: `1234`
   * Go to **Cloud Setup** tab and paste your **Supabase URL** and **Anon API Key** (found in your Supabase project settings -> API).
   * Click **Save Settings**.
6. Now you can use the **Upload Song** tab anytime! Select your `.mp3` and cover image, and it will immediately publish to the app for all listeners.

---

### Method 2: Offline / Static File Drop (Zero Cloud Setup)

If you just want to put your current ~40 MP3 files directly in the codebase:

1. Place your MP3 files into the `public/audio/` folder.
2. Edit `public/songs.json` to list your songs:
   ```json
   [
     {
       "id": "song-1",
       "title": "My Track Name",
       "artist": "My AI Artist Name",
       "url": "/audio/my-song.mp3",
       "coverUrl": "https://images.unsplash.com/...",
       "duration": 185,
       "genre": "Synthwave",
       "createdAt": "2026-10-24T12:00:00Z"
     }
   ]
   ```
3. Whenever you add a new song, simply update `public/songs.json`.

---

## 🌐 How to Host Free for You & Your Friends (Vercel)

The easiest way to share the app with your friends is using **Vercel** (100% free):

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial AI Beats app"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. (Optional) Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
5. Click **Deploy**. Vercel will give you a free URL (e.g., `https://my-ai-music.vercel.app`).
6. Send that link to your friends!

---

## 📱 How Friends Install the App

* **iPhone (iOS Safari)**: Open the link in Safari, tap the **Share** button (`⎋`), and select **"Add to Home Screen"**.
* **Android (Chrome)**: Tap the **"Install App"** button at the top of the player or tap the 3-dots menu -> **"Install app"**.

Once installed:
- It launches full-screen with no browser search bars.
- Music plays in the background even when the phone is locked.
- Lock screen shows the song title, artist, album art, and media controls.
- Friends can download any MP3 directly to their phone with the download button.

---

## 🛠️ Security Note
The Admin PIN defaults to `1234`. You can change this to any secret PIN you want inside the **Creator Studio -> Cloud Setup** tab.
