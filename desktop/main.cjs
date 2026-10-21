"use strict";
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  session,
} = require("electron");
const path = require("node:path");
const { pathToFileURL, fileURLToPath } = require("node:url");
const { createFileService } = require("./files.cjs");
const entry = path.join(__dirname, "..", "index.html");
let window,
  files,
  ready = false,
  state = { dirty: false, busy: false },
  discardApproved = false;
const pendingFiles = [];
const acceptedFile = (filename) =>
  /\.picturesque(?:-workspace)?$/i.test(filename);
function queueArgs(args) {
  for (const arg of args)
    if (!arg.startsWith("-") && path.isAbsolute(arg) && acceptedFile(arg))
      pendingFiles.push(arg);
  deliverFiles();
}
function trusted(event) {
  return (
    window &&
    !window.isDestroyed() &&
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url === pathToFileURL(entry).href
  );
}
function assertTrusted(event) {
  if (!trusted(event)) throw new Error("Untrusted desktop request.");
}
async function deliverFiles() {
  if (!ready || !files) return;
  while (pendingFiles.length) {
    try {
      const value = await files.open(pendingFiles.shift());
      window.webContents.send("picturesque:open-file", value);
    } catch (error) {
      dialog.showErrorBox("Could not open Picturesque file", error.message);
    }
  }
}
function command(name) {
  if (ready && !state.busy)
    window.webContents.send("picturesque:command", name);
}
function createMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "New canvas",
            accelerator: "CmdOrCtrl+N",
            click: () => command("new"),
          },
          {
            label: "Open project…",
            accelerator: "CmdOrCtrl+O",
            click: () => command("open-project"),
          },
          { label: "Open workspace…", click: () => command("open-workspace") },
          { type: "separator" },
          {
            label: "Save project",
            accelerator: "CmdOrCtrl+S",
            click: () => command("save"),
          },
          {
            label: "Save project as…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => command("save-as"),
          },
          {
            label: "Save workspace backup…",
            click: () => command("save-workspace"),
          },
          {
            label: "Export image…",
            accelerator: "CmdOrCtrl+Shift+E",
            click: () => command("export"),
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          {
            label: "Undo",
            accelerator: "CmdOrCtrl+Z",
            click: () => command("undo"),
          },
          {
            label: "Redo",
            accelerator: "CmdOrCtrl+Shift+Z",
            click: () => command("redo"),
          },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { label: "Fit canvas", click: () => command("fit") },
          { role: "togglefullscreen" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
        ],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "Picturesque website",
            click: () =>
              shell.openExternal(
                "https://averydimbulb79.github.io/Picturesque/",
              ),
          },
          {
            label: "About Picturesque",
            click: () =>
              dialog.showMessageBox(window, {
                type: "info",
                message: "Picturesque " + app.getVersion(),
                detail:
                  "Windows preview. Local image editing with the same editor as the browser version.",
              }),
          },
        ],
      },
    ]),
  );
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, args) => {
    queueArgs(args);
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.on("open-file", (event, filename) => {
    event.preventDefault();
    if (acceptedFile(filename)) pendingFiles.push(filename);
    deliverFiles();
  });
  app.whenReady().then(() => {
    files = createFileService({
      userData: app.getPath("userData"),
      chooseSave: async ({ name, extension }) => {
        const result = await dialog.showSaveDialog(window, {
          defaultPath: name,
          filters: [
            {
              name:
                extension === "picturesque"
                  ? "Picturesque project"
                  : extension.toUpperCase(),
              extensions: [extension],
            },
          ],
          properties: ["showOverwriteConfirmation", "createDirectory"],
        });
        return result.canceled ? null : result.filePath;
      },
    });
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: "#252525",
      title: "Picturesque " + app.getVersion(),
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });
    session.defaultSession.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    const allowedHosts = new Set([
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "fonts.google.com",
    ]);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      let allowed = false;
      try {
        const url = new URL(details.url);
        if (url.protocol === "file:") {
          const relative = path.relative(
            path.dirname(entry),
            fileURLToPath(url),
          );
          allowed =
            relative !== ".." &&
            !relative.startsWith(".." + path.sep) &&
            !path.isAbsolute(relative);
        } else
          allowed =
            ["data:", "blob:"].includes(url.protocol) ||
            (url.protocol === "https:" && allowedHosts.has(url.hostname));
      } catch {}
      callback({ cancel: !allowed });
    });
    window.webContents.on("will-navigate", (event, url) => {
      if (url !== pathToFileURL(entry).href) event.preventDefault();
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const value = new URL(url);
        if (
          value.protocol === "https:" &&
          value.hostname === "fonts.google.com"
        )
          shell.openExternal(url);
      } catch {}
      return { action: "deny" };
    });
    window.on("close", (event) => {
      if (state.busy) {
        event.preventDefault();
        dialog.showMessageBoxSync(window, {
          type: "info",
          message: "Wait for the current file or editing operation to finish.",
        });
        return;
      }
      if (state.dirty && !discardApproved) {
        const choice = dialog.showMessageBoxSync(window, {
          type: "warning",
          buttons: ["Keep editing", "Discard unsaved changes"],
          defaultId: 0,
          cancelId: 0,
          message: "There are projects with unsaved changes.",
          detail:
            "Keep editing to save projects or a workspace backup before closing.",
        });
        if (choice !== 1) event.preventDefault();
        else discardApproved = true;
      }
    });
    window.webContents.on("will-prevent-unload", (event) => {
      if (discardApproved) {
        event.preventDefault();
        return;
      }
      const result = dialog.showMessageBoxSync(window, {
        type: "warning",
        buttons: ["Keep editing", "Discard unsaved changes"],
        defaultId: 0,
        cancelId: 0,
        message: "There are projects with unsaved changes.",
        detail:
          "Choose Keep editing to save projects or a workspace backup before closing.",
      });
      if (result === 1) {
        discardApproved = true;
        event.preventDefault();
      }
    });
    window.webContents.on("did-start-loading", () => {
      ready = false;
      discardApproved = false;
    });
    window.once("ready-to-show", () => window.show());
    ipcMain.handle("picturesque:open", async (event, kind) => {
      assertTrusted(event);
      if (!["project", "workspace"].includes(kind))
        throw new Error("Invalid document type");
      const extension =
        kind === "project" ? "picturesque" : "picturesque-workspace";
      const result = await dialog.showOpenDialog(window, {
        properties: ["openFile"],
        filters: [
          { name: "Picturesque " + kind, extensions: [extension, "json"] },
        ],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      const filename = result.filePaths[0];
      if (path.extname(filename).toLowerCase() === ".json") {
        // Explicitly chosen legacy JSON: grant a project handle through the same reader.
        const fs = require("node:fs/promises");
        const handle = await fs.open(filename, "r");
        try {
          if ((await handle.stat()).size > 150000000)
            throw new Error("File exceeds 150 MB");
          return {
            text: await handle.readFile("utf8"),
            name: path.basename(filename),
            kind,
            token: null,
          };
        } finally {
          await handle.close();
        }
      }
      return files.open(filename);
    });
    for (const [channel, method] of [
      ["save", "saveProject"],
      ["export", "exportFile"],
      ["recovery", "recovery"],
    ])
      ipcMain.handle("picturesque:" + channel, (event, value) => {
        assertTrusted(event);
        return files[method](value);
      });
    ipcMain.on("picturesque:state", (event, value) => {
      if (trusted(event) && value)
        state = { dirty: !!value.dirty, busy: !!value.busy };
    });
    ipcMain.on("picturesque:ready", (event) => {
      if (trusted(event)) {
        ready = true;
        deliverFiles();
      }
    });
    createMenu();
    window.loadFile(entry);
    queueArgs(process.argv.slice(app.isPackaged ? 1 : 2));
  });
  app.on("window-all-closed", () => app.quit());
}
