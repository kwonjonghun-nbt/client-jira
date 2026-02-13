import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    alias: {
      '@main/': new URL('./src/main/', import.meta.url).pathname,
      '@renderer/': new URL('./src/renderer/', import.meta.url).pathname,
    },
  },
});
