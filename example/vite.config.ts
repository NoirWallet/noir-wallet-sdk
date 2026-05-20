import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/example/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: 'localhost',
    port: 5002,
    strictPort: true,
    headers: {
      'Content-Security-Policy':
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http://localhost:* http://127.0.0.1:*; object-src 'self'; connect-src 'self' http://localhost:* ws://localhost:*;"
    }
  }
})
