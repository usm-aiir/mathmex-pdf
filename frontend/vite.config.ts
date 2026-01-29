import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/pdf_reader/',
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
        target: 'http://localhost:9095',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})