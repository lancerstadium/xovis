import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

declare const __dirname: string;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const opts: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    backgroundColor: '#f0f0f0',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, '../build/icon.png'),
  };
  if (process.platform === 'darwin') {
    opts.titleBarStyle = 'hiddenInset';
    opts.trafficLightPosition = { x: 14, y: 14 };
  } else {
    opts.frame = false;
  }
  mainWindow = new BrowserWindow(opts);

  mainWindow.webContents.on('did-finish-load', () => {
    if (process.platform === 'darwin') {
      mainWindow!.webContents.insertCSS(
        'html, body { height: 100vh; margin: 0; overflow: hidden; box-sizing: border-box; } body { padding-top: max(env(safe-area-inset-top), 52px) !important; } .app { height: 100% !important; min-height: 0 !important; }'
      );
    } else {
      mainWindow!.webContents.insertCSS(
        'html, body { height: 100vh; margin: 0; overflow: hidden; box-sizing: border-box; } body { padding-top: 24px !important; } .app { height: 100% !important; min-height: 0 !important; }'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  ipcMain.handle('electron-window-minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('electron-window-maximize', () => {
    mainWindow?.maximize();
  });
  ipcMain.handle('electron-window-close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('electron-window-toggle-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('electron-window-is-maximized', () => mainWindow?.isMaximized() ?? false);

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
      // 打包后：web/dist 在 app 根目录下，getAppPath 返回 app.asar 或 app 目录
      indexPath = join(app.getAppPath(), 'web', 'dist', 'index.html');
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
        mainWindow.loadURL(
          'data:text/html,<h1>Failed to load application</h1><p>Please rebuild the web application.</p>'
        );
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
