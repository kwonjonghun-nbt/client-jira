import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    rollupOptions: {
      external: ['node-pty'],
    },
  },
});
