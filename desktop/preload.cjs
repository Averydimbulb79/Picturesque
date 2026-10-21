"use strict";
const { contextBridge, ipcRenderer } = require("electron");
function subscribe(channel, callback) {
  if (typeof callback !== "function") return () => {};
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
contextBridge.exposeInMainWorld(
  "picturesqueDesktop",
  Object.freeze({
    openFile: (kind) => ipcRenderer.invoke("picturesque:open", kind),
    saveProject: (request) => ipcRenderer.invoke("picturesque:save", request),
    exportFile: (request) => ipcRenderer.invoke("picturesque:export", request),
    recovery: (request) => ipcRenderer.invoke("picturesque:recovery", request),
    setState: (state) => ipcRenderer.send("picturesque:state", state),
    ready: () => ipcRenderer.send("picturesque:ready"),
    onOpenFile: (callback) => subscribe("picturesque:open-file", callback),
    onCommand: (callback) => subscribe("picturesque:command", callback),
  }),
);
