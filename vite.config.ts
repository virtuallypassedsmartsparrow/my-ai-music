import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'

function autoSyncMusicPlugin() {
  return {
    name: 'auto-sync-music',
    configureServer(server: any) {
      const audioPath = path.resolve(import.meta.dirname || process.cwd(), 'public/audio');
      server.watcher.add(audioPath);
      const resync = (filePath: string) => {
        if (filePath.includes('public') && (filePath.includes('audio') || filePath.endsWith('.mp3'))) {
          try {
            execSync('node scripts/sync-music.js', { stdio: 'inherit' });
            server.ws.send({ type: 'full-reload' });
          } catch (e) {
            console.error('Auto-sync failed:', e);
          }
        }
      };
      server.watcher.on('add', resync);
      server.watcher.on('unlink', resync);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    autoSyncMusicPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'AI Beats Music Player',
        short_name: 'AI Beats',
        description: 'Stream and discover new AI-generated music tracks',
        theme_color: '#06090e',
        background_color: '#06090e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/storage\/v1\/object\/public\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200, 206]
              }
            }
          }
        ]
      }
    })
  ]
})
