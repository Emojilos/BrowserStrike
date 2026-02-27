import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@browserstrike/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
  },
});
