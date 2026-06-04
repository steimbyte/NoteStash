import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'content/modules/index.mjs'),
      name: 'NoteStash',
      fileName: 'content',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        extend: true,
        globals: {}
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'content'),
      '@core': resolve(__dirname, 'content/modules/core'),
      '@ui': resolve(__dirname, 'content/modules/ui'),
      '@features': resolve(__dirname, 'content/modules/features'),
      '@session': resolve(__dirname, 'content/modules/session'),
      '@images': resolve(__dirname, 'content/modules/images'),
      '@content': resolve(__dirname, 'content/modules/content'),
      '@performance': resolve(__dirname, 'content/modules/performance'),
      '@recording': resolve(__dirname, 'content/modules/recording')
    }
  }
});
