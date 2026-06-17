import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kiropad', {
  getState: () => ipcRenderer.invoke('get-state'),
  regenerateCode: () => ipcRenderer.invoke('regenerate-code'),
  disconnectAll: () => ipcRenderer.invoke('disconnect-all'),
  restartTunnel: () => ipcRenderer.invoke('restart-tunnel'),
  onStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('state-update', (_event, state) => callback(state));
  },
});
