import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  // Prevent Vite from pre-bundling transformers.js — it uses dynamic imports & WASM
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
  // Build workers as ES modules so dynamic imports work inside them
  worker: {
    format: 'es',
  },
})
