import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import renderLabSave from './tools/render-lab/vite-plugin-save.js'

// https://vitejs.dev/config/
export default defineConfig({
  // renderLabSave solo actúa en `vite dev`: guarda las imágenes del laboratorio de renders
  plugins: [react(), renderLabSave()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          lucide: ['lucide-react']
        }
      }
    }
  }
})
