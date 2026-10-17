import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

const isDevHttps = process.env.VITE_DEV_HTTPS === 'true'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isDevHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      manifest: {
        name: 'TindaTrack — Sari-Sari POS',
        short_name: 'TindaTrack',
        description: 'Point of sale and inventory management system tailored for Philippine sari-sari stores.',
        id: '/',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#0e7c66',
        background_color: '#0a4d40',
        lang: 'en',
        dir: 'ltr',
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'POS',
            short_name: 'POS',
            url: '/pos',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Products',
            short_name: 'Products',
            url: '/products',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Scan to add',
            short_name: 'Scan',
            url: '/products?action=add-by-barcode',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/*.wasm', '**/*.onnx', '**/ort-*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^\/demo-products\/.*\.svg$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'demo-product-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^\/api\/product-images\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-product-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    ...(isDevHttps
      ? {
          host: true,
          proxy: {
            '/api': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : {}),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'vendor-recharts'
            }
            if (id.includes('motion')) {
              return 'vendor-motion'
            }
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) {
              return 'vendor-radix'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            if (id.includes('@huggingface') || id.includes('onnxruntime')) {
              return 'vendor-transformers'
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack'
            }
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 30000,
    fileParallelism: false,
  },
})
