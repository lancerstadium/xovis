export interface ElectronWindowControls {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

export interface ElectronAPI {
  platform: string;
  versions: { node: string; chrome: string; electron: string };
  windowControls: ElectronWindowControls;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
