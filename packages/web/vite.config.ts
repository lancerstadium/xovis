import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@xovis/core': path.resolve(__dirname, '../core/src'),
    },
  },
  optimizeDeps: {
    include: ['@dagrejs/dagre', '@dagrejs/graphlib'],
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      ignoreTryCatch: false,
    },
  },
});
