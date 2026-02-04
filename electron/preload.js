const { contextBridge } = require("electron");

/**
 * Preload script with context isolation enabled.
 *
 * CURRENT STATUS:
 * - Does not expose any custom APIs yet.
 * - Serves as a secure bridge for future IPC if needed.
 */

contextBridge.exposeInMainWorld("electronAPI", {
  // Placeholder for future, explicitly allowed APIs.
});

