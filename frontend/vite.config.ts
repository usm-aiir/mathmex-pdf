import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  server: {
    proxy: {
      '/pdf_reader/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})