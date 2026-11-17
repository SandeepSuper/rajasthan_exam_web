import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are forwarded to the backend so the browser
// sees a single origin (no CORS needed). Set VITE_DEV_API_TARGET in .env.local.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_API_TARGET || 'http://localhost:8080';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true, ws: true },
        '/uploads': { target, changeOrigin: true },
        '/privacy-policy.html': { target, changeOrigin: true },
        '/support.html': { target, changeOrigin: true },
      },
    },
  };
});
