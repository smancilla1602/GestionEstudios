/**
 * Proceso principal de Electron.
 * - Crea la ventana (React + Vite).
 * - Inicializa SQLite en app.getPath('userData')/data/estudios.db.
 * - Registra los canales IPC.
 */

const path = require('node:path');
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { initDatabase, closeDatabase, getDbPath } = require('./db/database');
const { registrarIpc } = require('./ipc');

app.setName('EstudiosMedicos');
app.setAppUserModelId('com.empresa.estudiosmedicos');

const esDesarrollo = Boolean(process.env.VITE_DEV_SERVER_URL);
let ventanaPrincipal = null;

function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#020617',
    title: 'Estudios Médicos | Recursos Humanos',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  ventanaPrincipal.once('ready-to-show', () => {
    ventanaPrincipal?.show();
  });

  ventanaPrincipal.on('closed', () => {
    ventanaPrincipal = null;
  });

  ventanaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  ventanaPrincipal.webContents.on('will-navigate', (evento, url) => {
    const permitida = esDesarrollo
      ? url.startsWith(process.env.VITE_DEV_SERVER_URL)
      : url.startsWith('file://');
    if (!permitida) {
      evento.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  if (esDesarrollo) {
    ventanaPrincipal.loadURL(process.env.VITE_DEV_SERVER_URL);
    ventanaPrincipal.webContents.openDevTools({ mode: 'detach' });
  } else {
    ventanaPrincipal.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function inicializarAplicacion() {
  try {
    initDatabase(app.getPath('userData'));
    console.log(`[db] SQLite lista en ${getDbPath()}`);
    registrarIpc();
  } catch (error) {
    console.error('[db] Error al inicializar la base de datos', error);
    dialog.showErrorBox(
      'No se pudo iniciar el sistema',
      `Ocurrió un error al preparar la base de datos local:\n\n${error?.message || error}`
    );
    app.quit();
    return false;
  }
  return true;
}

const bloqueoInstancia = app.requestSingleInstanceLock();

if (!bloqueoInstancia) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventanaPrincipal) {
      if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore();
      ventanaPrincipal.focus();
    }
  });

  app.whenReady().then(() => {
    if (!inicializarAplicacion()) return;

    Menu.setApplicationMenu(esDesarrollo ? Menu.getApplicationMenu() : null);
    crearVentana();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    closeDatabase();
  });
}

process.on('uncaughtException', (error) => {
  console.error('[main] Excepción no controlada', error);
});
