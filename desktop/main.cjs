const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEFAULT_SERVER = 'https://cliniquecima.up.railway.app';
const ICON = path.join(__dirname, 'assets', 'cima.png');
const pagePath = name => path.join(__dirname, 'pages', name);
const localPage = name => pathToFileURL(pagePath(name)).href;
let mainWindow, settingsWindow, appSession, serverUrl = DEFAULT_SERVER;
let configPath;

app.setName('CIMA');
app.setAppUserModelId('app.cima.clinique');
app.enableSandbox();

function normalizeServer(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Adresse du serveur invalide.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Entrez une adresse complète, par exemple https://cliniquecima.up.railway.app ou http://192.168.1.10:3001.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname || url.search || url.hash) throw new Error('Utilisez une adresse HTTP ou HTTPS, sans identifiant, mot de passe ou paramètres.');
  return url.href.replace(/\/+$/, '');
}

function safeExternal(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) void shell.openExternal(url.href);
  } catch { /* Ignore non-web URLs. */ }
}

function remoteOptions() {
  return { session: appSession, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false };
}

function protectRemoteWindow(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === new URL(serverUrl).origin) return { action: 'allow', overrideBrowserWindowOptions: { title: 'CIMA', icon: ICON, width: 1200, height: 800, autoHideMenuBar: true, webPreferences: remoteOptions() } };
    } catch { /* Invalid destinations are denied. */ }
    safeExternal(url); return { action: 'deny' };
  });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  const restrictNavigation = (event, url) => {
    try { if (new URL(url).origin === new URL(serverUrl).origin) return; } catch { /* Deny unknown protocols. */ }
    event.preventDefault(); safeExternal(url);
  };
  window.webContents.on('will-navigate', restrictNavigation);
  window.webContents.on('will-redirect', restrictNavigation);
  window.webContents.on('did-create-window', child => protectRemoteWindow(child));
}

async function connect() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try { await mainWindow.loadURL(serverUrl); }
  catch { if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.loadFile(pagePath('offline.html')); }
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({ parent: mainWindow, modal: true, width: 620, height: 520, resizable: false, title: 'CIMA — Serveur', icon: ICON, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'settings-preload.cjs') } });
  settingsWindow.setMenu(null);
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWindow.webContents.on('will-navigate', event => event.preventDefault());
  settingsWindow.on('closed', () => { settingsWindow = null; });
  void settingsWindow.loadFile(pagePath('settings.html'));
}

function trustedSettings(event) {
  if (!settingsWindow || event.sender !== settingsWindow.webContents || event.senderFrame?.url !== localPage('settings.html')) throw new Error('Action non autorisée.');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    configPath = path.join(app.getPath('userData'), 'server.json');
    try { serverUrl = normalizeServer(JSON.parse(fs.readFileSync(configPath, 'utf8')).url); }
    catch { serverUrl = DEFAULT_SERVER; }
    appSession = session.fromPartition('persist:cima');
    appSession.setPermissionCheckHandler((contents, permission, origin) => {
      try { return new URL(origin).origin === new URL(serverUrl).origin && ['media', 'clipboard-sanitized-write', 'fullscreen'].includes(permission); }
      catch { return false; }
    });
    appSession.setPermissionRequestHandler(async (contents, permission, callback, details) => {
      let sameServer = false;
      try { sameServer = new URL(contents.getURL()).origin === new URL(serverUrl).origin; } catch { /* No permission for local error pages. */ }
      if (!sameServer) { callback(false); return; }
      if (permission === 'fullscreen' || permission === 'clipboard-sanitized-write') { callback(true); return; }
      if (permission === 'media' && details.mediaTypes?.length && details.mediaTypes.every(type => type === 'audio')) {
        const result = await dialog.showMessageBox(mainWindow, { type: 'question', title: 'Microphone', message: 'Autoriser CIMA à utiliser le microphone pour la dictée ?', buttons: ['Refuser', 'Autoriser'], defaultId: 0, cancelId: 0 });
        callback(result.response === 1); return;
      }
      callback(false);
    });
    appSession.on('will-download', (event, item) => {
      const filename = path.basename(item.getFilename()).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
      item.setSaveDialogOptions({ title: 'Enregistrer le document CIMA', defaultPath: path.join(app.getPath('downloads'), filename) });
    });

    ipcMain.handle('cima:settings', event => { trustedSettings(event); return { url: serverUrl, defaultUrl: DEFAULT_SERVER }; });
    ipcMain.handle('cima:save-server', async (event, value) => {
      trustedSettings(event);
      try {
        const url = normalizeServer(value);
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(`${configPath}.tmp`, `${JSON.stringify({ url }, null, 2)}\n`);
        fs.renameSync(`${configPath}.tmp`, configPath);
        serverUrl = url;
        // Close after IPC returns so the form receives a definite outcome.
        setImmediate(() => { settingsWindow?.close(); void connect(); });
        return { ok: true };
      } catch (error) { return { ok: false, error: error.message }; }
    });

    mainWindow = new BrowserWindow({ title: 'CIMA', width: 1440, height: 960, minWidth: 880, minHeight: 640, backgroundColor: '#f1f5f9', icon: ICON, show: false, webPreferences: remoteOptions() });
    protectRemoteWindow(mainWindow);
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.webContents.on('page-title-updated', event => { event.preventDefault(); mainWindow.setTitle('CIMA'); });
    mainWindow.on('closed', () => { mainWindow = null; });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Application', submenu: [
        { label: 'Recharger CIMA', accelerator: 'CmdOrCtrl+R', click: () => void connect() },
        { label: 'Connexion au serveur…', click: openSettings },
        { type: 'separator' },
        { label: 'Ouvrir dans le navigateur', click: () => safeExternal(serverUrl) },
        { type: 'separator' }, { role: 'quit', label: 'Quitter' },
      ] },
      { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
      { label: 'Affichage', submenu: [{ role: 'resetZoom', label: 'Taille normale' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
      { label: 'Aide', submenu: [{ label: 'À propos de CIMA', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: 'CIMA', message: `CIMA ${app.getVersion()}`, detail: 'Application pour les postes de la clinique.\nLes données sont conservées sur le serveur configuré.' }) }] },
    ]));
    void connect();
  }).catch(error => { dialog.showErrorBox('CIMA', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
