## Electron integration overview

Current Electron support is intentionally minimal and incremental:

- `electron/main.js` – main process entry, opens the existing Next.js app in a secure window.
- `electron/preload.js` – preload script with `contextIsolation: true` and no Node integration in the renderer.

### Running in development

1. Ensure the Next.js dev server is running:

```bash
npm run dev
```

2. Start the Electron shell (after installing dev dependencies locally):

```bash
npm install --save-dev electron electron-builder --legacy-peer-deps
npm run electron:dev
```

### Building a Windows installer (future step)

Once the standalone Next.js build and local Postgres integration are ready, you will be able to:

```bash
npm run build              # Next.js standalone build
npm run electron:build     # electron-builder for Windows x64
```

This will produce a Windows installer under `dist-electron/`.

