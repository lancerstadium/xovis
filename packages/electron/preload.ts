import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke('electron-window-minimize'),
    maximize: () => ipcRenderer.invoke('electron-window-maximize'),
    close: () => ipcRenderer.invoke('electron-window-close'),
    toggleMaximize: () => ipcRenderer.invoke('electron-window-toggle-maximize'),
    isMaximized: () => ipcRenderer.invoke('electron-window-is-maximized') as Promise<boolean>,
  },
});
