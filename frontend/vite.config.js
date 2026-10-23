import os from 'node:os'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

const isDevHttps = process.env.VITE_DEV_HTTPS === 'true'
const DEV_PORT = 5173

/**
 * First private (RFC 1918) IPv4 of this machine, so the phone-pairing QR can
 * point at the laptop's Wi-Fi address instead of the phone's own localhost.
 */
function firstPrivateIPv4() {
  const isPrivate = (ip) =>
    /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      const isV4 = net.family === 'IPv4' || net.family === 4
      if (isV4 && !net.internal && isPrivate(net.address)) return net.address
    }
  }
  return ''
}

export default defineConfig(({ command }) => {
  // `npm run dev:lan` only (HTTPS + relative /api through the proxy, reachable from a phone).
  // Plain `npm run dev` talks to localhost:8000, which a phone can't reach, so it keeps the
  // localhost warning. Never baked into production builds or the test run.
  const lanIp = command === 'serve' && isDevHttps && !process.env.VITEST ? firstPrivateIPv4() : ''
  const devLanOrigin = lanIp ? `${isDevHttps ? 'https' : 'http'}://${lanIp}:${DEV_PORT}` : ''

  return {
    define: {
      'import.meta.env.VITE_DEV_LAN_ORIGIN': JSON.stringify(devLanOrigin),
    },
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
              // The phone opens straight to the pairing / scanner page
              name: 'Phone scanner',
              short_name: 'Scanner',
              url: '/scan',
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
              // Workbox tests RegExps against the full URL, so "^/…" never matched: match the path
              urlPattern: ({ url }) => /^\/demo-products\/.*\.svg$/i.test(url.pathname),
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
              // Also matches an API on another origin (Railway) in production
              urlPattern: ({ url }) => url.pathname.startsWith('/api/product-images/'),
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
              // Everything else under /api is never cached
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
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
      port: DEV_PORT,
      strictPort: true,
      // dev:lan (HTTPS) must listen on the Wi-Fi interface so a phone can open it
      host: isDevHttps ? true : undefined,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
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
  }
})
