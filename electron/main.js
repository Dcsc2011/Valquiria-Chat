const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const Store = require('./store');

const store = new Store();

let mainWindow = null;

const DEFAULT_URL = 'http://localhost:4000';

function getServerUrl() {
  return store.get('serverUrl') || DEFAULT_URL;
}

function createWindow() {
  const bounds = store.get('windowBounds') || { width: 1280, height: 800 };

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 360,
    minHeight: 500,
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: 'Valquíria Chat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(getServerUrl());

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Abre links externos (ex: anexos, downloads externos) no browser do sistema, não dentro da app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  buildMenu();
}

function saveBounds() {
  if (!mainWindow) return;
  store.set('windowBounds', mainWindow.getBounds());
}

function openSettingsWindow() {
  const settingsWin = new BrowserWindow({
    width: 420,
    height: 220,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: true,
    backgroundColor: '#111b21',
    title: 'Configurar servidor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
}

function buildMenu() {
  const template = [
    {
      label: 'Valquíria Chat',
      submenu: [
        {
          label: 'Alterar servidor...',
          click: () => openSettingsWindow(),
        },
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas de programador' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Seleccionar tudo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'resetZoom', label: 'Zoom padrão' },
        { role: 'zoomIn', label: 'Aumentar zoom' },
        { role: 'zoomOut', label: 'Diminuir zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Ecrã inteiro' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('get-server-url', () => getServerUrl());
ipcMain.handle('set-server-url', (event, url) => {
  store.set('serverUrl', url);
  if (mainWindow) mainWindow.loadURL(url);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
