import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'pwa-256x256.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Embark — Client Onboarding',
        short_name: 'Embark',
        description: 'Track and manage client onboarding from start to finish',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        // Cache app shell and assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Don't cache API calls
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Cache Google Fonts if ever added
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  // Ensure Tauri always finds the dev server on the expected port
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — always needed, cache aggressively
          'vendor-react': ['react', 'react-dom'],
          // Drag-and-drop — only needed in views that use it
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Export libs — only needed when user clicks export
          'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable'],
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
