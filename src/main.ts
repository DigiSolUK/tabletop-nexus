import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createMainServices, registerDesktopHandlers, type MainServices } from './main/ipc';

let mainWindow: BrowserWindow | null = null;
let services: MainServices | null = null;
let pendingProtocolUrl: string | null = null;

if (started) {
  app.quit();
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1220,
    minHeight: 760,
    show: false,
    title: 'TableTop Nexus',
    backgroundColor: '#08111f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const handleProtocolUrl = (value: string) => {
  pendingProtocolUrl = value;
  services?.authService.captureCallbackUrl(value);
  if (mainWindow) {
    void mainWindow.focus();
  }
};

const findProtocolUrl = (argv: string[]) => argv.find((entry) => entry.startsWith('tabletopnexus://')) ?? null;

app.setAsDefaultProtocolClient('tabletopnexus');

app.on('second-instance', (_event, argv) => {
  const protocolUrl = findProtocolUrl(argv);
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

app.whenReady().then(() => {
  services = createMainServices(app);
  registerDesktopHandlers(app, services);
  const initialProtocolUrl = findProtocolUrl(process.argv);
  if (initialProtocolUrl) {
    handleProtocolUrl(initialProtocolUrl);
  }
  if (pendingProtocolUrl && services) {
    services.authService.captureCallbackUrl(pendingProtocolUrl);
  }
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
