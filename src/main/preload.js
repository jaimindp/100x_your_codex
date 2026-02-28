const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("monitor", {
  ping: () => ipcRenderer.invoke("app:ping"),
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
});
