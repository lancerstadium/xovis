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
              theme_color: '#f0f0f0',
              background_color: '#f0f0f0',
              display: 'standalone',
              start_url: basePath,
              // icons 由 pwaAssets 从 favicon.svg 生成 192/512 PNG；favicon.svg 仅保留 viewBox、不设 width/height，避免栅格化时按 32px 渲染再放大导致糊
            },
            pwaAssets: {
              image: 'public/favicon.svg',
              overrideManifestIcons: true,
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,svg,woff2,json}'],
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
    host: true, // 监听 0.0.0.0，允许局域网访问
    cors: true, // 允许跨域，避免“拒绝访问”
    strictPort: false, // 端口被占用时自动尝试下一端口
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
