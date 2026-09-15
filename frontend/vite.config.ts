import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the browser calls /api on the Vite server, which forwards to FastAPI.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8020',
        configure: (proxy) => {
          // If FastAPI isn't running, answer 503 Service Unavailable (instead of a bare 500), so the
          // app can tell the student the server can't be reached rather than that it had an error.
          proxy.on('error', (_error, _request, response) => {
            const httpResponse = response as ServerResponse
            if (typeof httpResponse.writeHead === 'function' && !httpResponse.headersSent) {
              httpResponse.writeHead(503).end()
            }
          })
        },
      },
    },
  },
  test: {
    // Component tests render into jsdom, a simulated browser page.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
