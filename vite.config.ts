import build from '@hono/vite-build/cloudflare-pages'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'worker') {
    // Build the Hono backend worker
    return {
      plugins: [build({ entry: 'src/index.tsx' })],
      build: {
        outDir: 'dist',
      },
    }
  }

  // Build the React SPA frontend
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // don't wipe the worker build
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  }
})
