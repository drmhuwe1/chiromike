import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large dependencies into their own chunks
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-dnd': ['@hello-pangea/dnd'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
    middlewareMode: false,
    // Ensure sw.js is served with correct headers during dev
    setupMiddlewares: (middlewares, { middlewareMode }) => {
      return middlewares;
    },
  },
})