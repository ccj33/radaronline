import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - carregado sempre
          'vendor-react': ['react', 'react-dom'],
          // Charts - lazy loaded com dashboard
          'vendor-charts': ['recharts'],
          // Maps - lazy loaded com mapa
          'vendor-maps': ['leaflet'],
          // Animation - usado em vários lugares mas pode ser deferido
          'vendor-motion': ['framer-motion'],
          // Backend - carregado após auth check
          'vendor-supabase': ['@supabase/supabase-js'],
          // Date utilities
          'vendor-date': ['date-fns'],
        }
      }
    },
    // Aumentar limite de warning para chunks grandes durante transição
    chunkSizeWarningLimit: 600,
  }
})
