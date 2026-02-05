const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const { initializeDatabase, closeDatabase } = require("../../lib/db");

// Keep a global reference of the window object
let mainWindow;

// Handle squirrel updater events
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../../.next/standalone")}/`;

  mainWindow.loadURL(startUrl, { userAgent: "Chrome" });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit();
          },
        },
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
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        isDev && { role: "toggleDevTools" },
      ].filter(Boolean),
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize app
app.on("ready", () => {
  try {
    // Initialize database
    initializeDatabase();
    createWindow();
    createMenu();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle any uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

// IPC handlers for database operations
ipcMain.handle("database:ready", () => {
  return true;
});
