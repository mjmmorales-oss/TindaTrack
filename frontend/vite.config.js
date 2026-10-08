import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
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
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack'
            }
          }
        },
      },
    },
  },
})
