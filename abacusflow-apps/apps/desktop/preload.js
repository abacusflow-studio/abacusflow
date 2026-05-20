const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("getAppVersion"),
  ping: () => ipcRenderer.invoke("ping"),
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron,
});
