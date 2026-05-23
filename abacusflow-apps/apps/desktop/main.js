const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
} = require("electron/main");
const path = require("node:path");
const fs = require("node:fs");

const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");
const isDev = !app.isPackaged;

function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { width: 1280, height: 800 };
}

function saveWindowState(win) {
  if (win.isMinimized() || win.isMaximized()) return;
  const bounds = win.getBounds();
  fs.writeFileSync(STATE_FILE, JSON.stringify(bounds));
}

function createWindow() {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    title: "小算盘 - AbacusFlow Admin",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  });

  // Save window state on resize/move
  win.on("resize", () => saveWindowState(win));
  win.on("move", () => saveWindowState(win));

  // Load the web app's static export
  const webAppPath = path.join(__dirname, "../web/out/index.html");
  if (fs.existsSync(webAppPath)) {
    win.loadFile(webAppPath);
  } else {
    win.loadFile(path.join(__dirname, "index.html"));
  }

  // Open devtools in dev mode
  if (isDev) {
    win.webContents.openDevTools();
  }

  return win;
}

// macOS app menu
if (process.platform === "darwin") {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
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
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    ipcMain.handle("getAppVersion", () => app.getVersion());
    ipcMain.handle("ping", () => "pong");
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
