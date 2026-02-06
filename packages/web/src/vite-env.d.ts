/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  // 可以添加其他环境变量类型定义
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
