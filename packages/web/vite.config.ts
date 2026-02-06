import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 检测是否为 GitHub Pages 部署环境
// GitHub Actions 会自动设置 GITHUB_ACTIONS 环境变量
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.VITE_BASE_PATH;
const basePath = process.env.VITE_BASE_PATH || (isGitHubPages ? '/xovis/' : '/');

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
