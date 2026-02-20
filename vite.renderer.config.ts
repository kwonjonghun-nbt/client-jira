import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    target: 'chrome130',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          zustand: ['zustand'],
          'date-fns': ['date-fns'],
          'react-query': ['@tanstack/react-query'],
        },
      },
    },
  },
});
