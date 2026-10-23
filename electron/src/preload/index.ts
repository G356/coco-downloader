import { contextBridge, ipcRenderer } from 'electron';

const material = process.argv.find(arg => arg.startsWith('--coco-material='))?.split('=')[1] ?? 'none';

// Keep the bridge minimal: the renderer never receives ipcRenderer itself.
contextBridge.exposeInMainWorld('coco', {
  platform: process.platform,
  material,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    toggleMini: () => ipcRenderer.send('window:toggle-mini'),
  },
});
