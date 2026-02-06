import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// base path 配置
// 在 GitHub Pages 部署时，build:pages 脚本会设置 VITE_BASE_PATH=/xovis/
// 本地开发时默认为 '/'
const basePath = process.env.VITE_BASE_PATH || '/';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath,
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
