import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'AI Beats Music Player',
        short_name: 'AI Beats',
        description: 'Stream and discover new AI-generated music tracks',
        theme_color: '#070709',
        background_color: '#070709',
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
            // Cache all local audio files with HTTP 206 byte-range request support for smooth streaming
            urlPattern: /\/audio\/.*\.(?:mp3|wav|m4a|ogg|flac)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-music-audio-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200, 206]
              },
              rangeRequests: true
            }
          },
          {
            // Keep songs metadata updated, but serve from cache when offline
            urlPattern: /\/songs\.json.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'songs-metadata-cache',
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /^https:\/\/.*\/storage\/v1\/object\/public\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200, 206]
              },
              rangeRequests: true
            }
          }
        ]
      }
    })
  ]
})
