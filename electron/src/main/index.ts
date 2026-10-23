import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, session, shell, type IpcMainEvent } from 'electron';
import { startNextServer, type NextServer } from './next-server';
import { initialBounds, MIN_HEIGHT, MIN_WIDTH, trackWindowState } from './window-state';

let server: NextServer | undefined;
let mainWindow: BrowserWindow | undefined;

if (!app.requestSingleInstanceLock()) app.quit();

function isTrustedSender(event: IpcMainEvent) {
  const url = event.senderFrame?.url;
  return Boolean(server && url && new URL(url).origin === server.origin);
}

function registerWindowControls() {
  const withWindow = (event: IpcMainEvent, action: (window: BrowserWindow) => void) => {
    if (!isTrustedSender(event)) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) action(window);
  };
  ipcMain.on('window:minimize', event => withWindow(event, window => window.minimize()));
  ipcMain.on('window:toggle-maximize', event => withWindow(event, window => (window.isMaximized() ? window.unmaximize() : window.maximize())));
  ipcMain.on('window:close', event => withWindow(event, window => window.close()));
  ipcMain.on('window:toggle-mini', event => withWindow(event, toggleMini));
}

// Mini mode: compact always-on-top window. The dedicated mini layout comes later;
// for now the regular UI shrinks and the full bounds are restored on exit.
const miniState = new WeakMap<BrowserWindow, Electron.Rectangle>();
function toggleMini(window: BrowserWindow) {
  const previous = miniState.get(window);
  if (previous) {
    miniState.delete(window);
    window.setAlwaysOnTop(false);
    window.setMinimumSize(MIN_WIDTH, MIN_HEIGHT);
    window.setBounds(previous, true);
    return;
  }
  if (window.isMaximized()) window.unmaximize();
  miniState.set(window, window.getBounds());
  window.setMinimumSize(360, 120);
  window.setAlwaysOnTop(true, 'floating');
  const { x, y, width } = window.getBounds();
  window.setBounds({ x: x + width - 420, y, width: 420, height: 140 }, true);
}

async function createWindow(origin: string, token: string) {
  // Session cookie lets the renderer proxy reject requests from other local apps or web pages.
  await session.defaultSession.cookies.set({ url: origin, name: 'coco_token', value: token, httpOnly: true, sameSite: 'strict' });

  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  const initial = initialBounds();
  const window = new BrowserWindow({
    ...initial.bounds,
    center: initial.bounds.x === undefined,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    frame: isMac,
    // 'hidden' (not 'hiddenInset') lets the traffic lights sit tight in the corner.
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    backgroundColor: isWindows || isMac ? '#00000000' : '#dfe2f6',
    backgroundMaterial: isWindows ? 'acrylic' : undefined,
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      additionalArguments: [`--coco-material=${isWindows ? 'acrylic' : isMac ? 'vibrancy' : 'none'}`],
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  trackWindowState(window);
  window.once('ready-to-show', () => {
    if (initial.maximized) window.maximize();
    window.show();
  });
  await window.loadURL(origin);
  return window;
}

// Dev runner (scripts/dev.mjs) asks for a window reload after preload rebuilds.
if (process.env.COCO_DEV_RELOAD && process.stdin) {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (String(chunk).includes('reload')) for (const window of BrowserWindow.getAllWindows()) window.webContents.reloadIgnoringCache();
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  registerWindowControls();
  try {
    server = await startNextServer();
    mainWindow = await createWindow(server.origin, server.token);
  } catch (error) {
    dialog.showErrorBox('CoCo 启动失败', error instanceof Error ? error.message : String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => server?.stop());
