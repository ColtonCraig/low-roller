// Low Roller desktop shell (Windows + macOS).
// Loads the game from src/ inside a locked-down window: no Node in the page, no remote content,
// no navigation away, no new windows. Saves live in the page's localStorage, which Electron keeps
// in the app's userData folder (that folder is what Steam Auto-Cloud should sync later).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    useContentSize: true,
    backgroundColor: '#120c0a',
    title: 'Low Roller',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Fullscreen: F11 everywhere, Alt+Enter on Windows (Cmd+Ctrl+F on Mac comes from the app menu).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (!isMac && input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  // The game never navigates or opens windows; anything that tries goes to the system browser or nowhere.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
}

// Mac apps need an app menu for Cmd+Q / Cmd+H / fullscreen; Windows gets none.
Menu.setApplicationMenu(isMac ? Menu.buildFromTemplate([
  { role: 'appMenu' },
  { role: 'windowMenu' },
  { label: 'View', submenu: [{ role: 'togglefullscreen' }] },
]) : null);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
