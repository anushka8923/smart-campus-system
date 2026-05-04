import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  resolve: {
    preserveSymlinks: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    watch: {
      usePolling: true,
      interval: 300
    }
  },
  optimizeDeps: {
    entries: ['index.html'],
    exclude: ['@vite/client']
  }
});

