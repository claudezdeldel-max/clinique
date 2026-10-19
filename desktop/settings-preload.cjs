const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cimaConnection', {
  read: () => ipcRenderer.invoke('cima:settings'),
  save: value => ipcRenderer.invoke('cima:save-server', value),
});
