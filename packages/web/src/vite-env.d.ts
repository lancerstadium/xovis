/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface ImportMetaEnv {
  readonly BASE_URL: string;
  // 可以添加其他环境变量类型定义
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
