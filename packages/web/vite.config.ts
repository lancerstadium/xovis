import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// base path 配置
// 在 GitHub Pages 部署时，build:pages 脚本会设置 VITE_BASE_PATH=/xovis/
// 本地开发时默认为 '/'
// embed/Electron 为 './'，不启用 PWA
const basePath = process.env.VITE_BASE_PATH || '/';
const isEmbed = basePath === './';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(isEmbed
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            scope: basePath,
            manifest: {
              name: 'xovis',
              short_name: 'xovis',
              description: 'JSON 计算图可视化',
              theme_color: '#1a1a1a',
              background_color: '#1a1a1a',
              display: 'standalone',
              start_url: basePath,
              icons: [
                { src: `${basePath}favicon.svg`, type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
                {
                  src: `${basePath}favicon-app.svg`,
                  type: 'image/svg+xml',
                  sizes: 'any',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
              navigateFallback: `${basePath}index.html`,
            },
          }),
        ]),
  ],
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
    // embed/Electron 场景下避免 crossorigin 导致 file:// 或 webview 加载失败
    modulePreload: basePath === './' ? false : true,
  },
});
