import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the browser calls /api on the Vite server, which forwards to FastAPI.
    proxy: {
      '/api': 'http://127.0.0.1:8020',
    },
  },
  test: {
    // Component tests render into jsdom, a simulated browser page.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
