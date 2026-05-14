import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5174,
    open: true,
    headers: {
      // Allow extension to inject scripts via blob: URLs
      'Content-Security-Policy':
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http://localhost:* http://127.0.0.1:*; object-src 'self'; connect-src 'self' http://localhost:* ws://localhost:*;"
    }
  }
})
