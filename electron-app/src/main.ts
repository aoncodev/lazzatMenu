import { app, BrowserWindow } from "electron";
import express from "express";
import path from "path";
import { getDb, closeDb } from "./db";
import { createRouter } from "./routes";

let mainWindow: BrowserWindow | null = null;
const PORT = 19532; // unlikely to conflict

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const server = express();
    const db = getDb();
    server.use(createRouter(db));

    // Serve the React frontend
    const frontendPath = app.isPackaged
      ? path.join(process.resourcesPath, "frontend")
      : path.join(__dirname, "..", "..", "frontend", "dist");

    server.use("/assets", express.static(path.join(frontendPath, "assets")));
    server.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });

    server.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    title: "Lazzat Menu Calculator",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  closeDb();
});
