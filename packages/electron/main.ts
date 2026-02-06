import { app, BrowserWindow } from 'electron';
import { join } from 'path';

// TypeScript 编译为 CommonJS 时会自动注入 __dirname
// 但源代码中需要声明，编译后会替换为实际的 __dirname
declare const __dirname: string;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, '../build/icon.png'),
  });

  if (process.env.NODE_ENV === 'development') {
    // 开发模式：连接到 web 开发服务器
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载 web 构建产物
    // electron-builder 会将 ../../web/dist 复制到打包后的应用中
    // 在打包后，路径相对于 app.asar 或 app 目录
    const isPackaged = app.isPackaged;
    let indexPath: string;
    
    if (isPackaged) {
      // 打包后：web/dist 在 resources/app/web/dist 或 app.asar/web/dist
      // electron-builder 会将 ../../web/dist 复制到打包后的应用中
      const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
      indexPath = join(resourcesPath || app.getAppPath(), 'web', 'dist', 'index.html');
    } else {
      // 开发构建：使用相对路径
      indexPath = join(__dirname, '../../web/dist/index.html');
    }
    
    mainWindow.loadFile(indexPath).catch((err: Error) => {
      console.error('Failed to load index.html:', err);
      // 尝试备用路径
      const fallbackPath = join(__dirname, '../../web/dist/index.html');
      mainWindow.loadFile(fallbackPath).catch((fallbackErr: Error) => {
        console.error('Failed to load fallback path:', fallbackErr);
        mainWindow.loadURL('data:text/html,<h1>Failed to load application</h1><p>Please rebuild the web application.</p>');
      });
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
