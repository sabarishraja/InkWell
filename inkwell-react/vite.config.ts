/**
 * vite.config.ts — Vite configuration for Inkwell.
 *
 * Plugins:
 *   - @vitejs/plugin-react    — React JSX + Fast Refresh
 *   - vite-plugin-pwa         — Service worker + Web App Manifest
 *
 * PWA precaches all JS, CSS, HTML, SVG, PNG, and MP3 files.
 * Runtime caching handles Supabase API and Google Fonts.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Include sound files in the precache manifest
      includeAssets: [
        'favicon.svg',
        'sounds/*.mp3',
        'icons/*.png',
      ],

      // Web App Manifest
      manifest: {
        name:             'Inkwell — Write Letters That Wait',
        short_name:       'Inkwell',
        description:      'Write a typewritten letter. Seal it. Let it arrive when the time is right.',
        theme_color:      '#0D0B09',
        background_color: '#0D0B09',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // Workbox service worker configuration
      workbox: {
        // Precache all static assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mp3,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          {
            // Supabase REST API — stale-while-revalidate for vault letters
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler:    'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxAgeSeconds: 60 * 60 * 24 }, // 24h
            },
          },
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler:    'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
            },
          },
        ],
      },

      // Enable service worker in development for testing
      devOptions: { enabled: false },
    }),
  ],
});
