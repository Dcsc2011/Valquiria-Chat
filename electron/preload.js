const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('valquiria', {
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
});
