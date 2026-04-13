import build from '@hono/vite-build/cloudflare-pages'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'worker') {
    // Build Hono backend worker from api/ folder — completely separate from src/
    return {
      plugins: [build({ entry: 'api/worker.ts' })],
      build: { outDir: 'dist' },
    }
  }

  // Build React SPA — only touches src/ and index.html, never api/
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: { index: path.resolve(__dirname, 'index.html') },
      },
    },
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  }
})
