import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the browser calls /api on the Vite server, which forwards to FastAPI.
    proxy: {
      '/api': 'http://127.0.0.1:8020',
    },
  },
})
