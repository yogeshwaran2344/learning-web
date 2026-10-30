import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res: any) => {
            console.warn('[Vite Proxy] Backend on :5001 is offline or connecting:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend API server on port 5001 is not running (502 Bad Gateway). Please run `npm run dev:all` or `npm run server` to start the backend, or use the client-side processing fallback.',
                code: 'BACKEND_OFFLINE'
              }));
            }
          });
        }
      }
    }
  }
})
