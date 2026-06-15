import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/v1/users': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/v1/problems': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/v1/submissions': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/v1/contests': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
});
