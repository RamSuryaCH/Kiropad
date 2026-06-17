import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, NativeImage } from 'electron';
import path from 'path';
import qrcode from 'qrcode-generator';
import { BridgeServer } from './bridge';
import { PairingManager } from './pairing';
import { TunnelManager } from './tunnel';
import { getLocalIP } from './network';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let bridge: BridgeServer | null = null;
let pairing: PairingManager | null = null;
let tunnel: TunnelManager | null = null;

const PORT = Number(process.env.KIROPAD_PORT) || 8765;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 700,
    resizable: false,
    maximizable: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '..', 'assets', 'trayTemplate.png');
  let trayIcon: NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('KiroPad');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show KiroPad', click: () => mainWindow?.show() },
    { label: 'New Pairing Code', click: () => { pairing?.regenerateCode(); mainWindow?.show(); } },
    { type: 'separator' },
    { label: 'Restart Tunnel', click: () => tunnel?.restart() },
    { type: 'separator' },
    { label: 'Quit KiroPad', click: () => { tunnel?.stop(); bridge?.stop(); app.exit(0); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

async function generateQRCode(): Promise<string | null> {
  const url = tunnel?.url;
  const code = pairing?.currentCode;
  if (!url || !code) return null;

  const payload = JSON.stringify({
    url: url.replace('https://', 'wss://'),
    code,
    v: '2.0.0',
  });

  try {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createDataURL(4, 2);
  } catch {
    return null;
  }
}

async function getState() {
  return {
    pairingCode: pairing!.currentCode,
    tunnelUrl: tunnel?.url || null,
    localIP: getLocalIP(),
    port: PORT,
    connectedDevices: bridge!.connectedDeviceCount,
    isRunning: bridge!.isRunning,
    tunnelRunning: tunnel?.running ?? false,
    qrCode: await generateQRCode(),
    isLockedOut: pairing!.isLockedOut,
    lockoutSeconds: pairing!.lockoutRemainingSeconds,
  };
}

async function sendStateToRenderer(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('state-update', await getState());
}

app.whenReady().then(async () => {
  pairing = new PairingManager();
  bridge = new BridgeServer(PORT, pairing);
  bridge.start();

  tunnel = new TunnelManager(PORT);
  tunnel.start();

  createWindow();
  createTray();

  mainWindow?.webContents.on('did-finish-load', () => {
    void sendStateToRenderer();
  });

  // IPC handlers
  ipcMain.handle('get-state', () => getState());

  ipcMain.handle('regenerate-code', async () => {
    pairing!.regenerateCode();
    await sendStateToRenderer();
    return pairing!.currentCode;
  });

  ipcMain.handle('disconnect-all', async () => {
    bridge!.disconnectAll();
    await sendStateToRenderer();
  });

  ipcMain.handle('restart-tunnel', () => {
    tunnel!.restart();
  });

  // Events
  pairing.on('code-changed', () => void sendStateToRenderer());
  pairing.on('lockout', () => void sendStateToRenderer());

  bridge.on('device-connected', (info: { name: string }) => {
    void sendStateToRenderer();
    new Notification({
      title: 'KiroPad',
      body: `${info.name || 'Device'} connected`,
    }).show();
  });
  bridge.on('device-disconnected', () => void sendStateToRenderer());

  tunnel.on('url-ready', () => {
    console.log(`Tunnel ready: ${tunnel!.url}`);
    void sendStateToRenderer();
  });
  tunnel.on('error', (msg: string) => {
    console.error(`Tunnel: ${msg}`);
    void sendStateToRenderer();
  });
  tunnel.on('stopped', () => void sendStateToRenderer());
});

app.on('window-all-closed', () => {});
app.on('activate', () => { if (mainWindow) mainWindow.show(); });
app.on('before-quit', () => { tunnel?.stop(); bridge?.stop(); });
