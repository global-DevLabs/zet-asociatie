## Electron integration overview

- `electron/main.js` – main process: first-run Postgres setup, then starts Postgres + Next.js and opens the app window.
- `electron/postgres-setup.js` – first-run logic: initdb, create DB, run migrations, write config (when Postgres is bundled).
- `electron/preload.js` – preload with `contextIsolation: true`, no Node in renderer.

### Build standalone on Windows (for Windows)

Do this **on a Windows machine** to produce a Windows installer (standalone app):

1. **Prerequisites:** Node.js (v18+) and npm on Windows.
2. **Clone and install:**
   ```bash
   cd zet-asociatie
   npm install --legacy-peer-deps
   ```
3. **Next.js standalone build** (this also copies `.next/static` and `public` into `.next/standalone` so the app can serve JS/CSS/fonts):
   ```bash
   npm run build
   ```
4. **(Optional) Bundle PostgreSQL** so the app installs Postgres on first run:
   - Download [PostgreSQL 17 Windows x64](https://www.postgresql.org/download/windows/) (e.g. EnterpriseDB zip).
   - Extract so `resources/postgres-win/bin/` contains `initdb.exe` and `postgres.exe` (see `resources/postgres-win/README.txt`).
5. **Build the Windows installer:**
   ```bash
   npm run electron:build
   ```
6. **Output:** `dist-electron/` — e.g. NSIS installer (`.exe`) for Windows x64. Run it on the target PC to install the standalone app.

On first launch, if Postgres was bundled, the app will set up the DB and config under `%APPDATA%\Zet Asociatie\`; otherwise configure an existing Postgres or env.

### Debug log (app opens then closes)

If the app starts and then closes immediately, a **debug log** is written to a text file so you can see the error:

- **Windows:** `%APPDATA%\Zet Asociatie\debug.log`  
  (e.g. `C:\Users\<You>\AppData\Roaming\Zet Asociatie\debug.log`)
- **macOS:** `~/Library/Application Support/Zet Asociatie/debug.log`

Open the file in Notepad (or any text editor). The first line shows the log file path; the rest are timestamped entries (startup, Postgres setup, Next server, and any **ERROR** or **uncaughtException** / **unhandledRejection**). Use the last lines to see why the app exited.

### 404 for `/_next/static/*` (blank screen, missing JS/CSS/fonts)

If the app window is blank and the browser/DevTools show **404** for `/_next/static/chunks/*.js`, `/_next/static/css/*.css`, or font files, the standalone build was missing static assets. Next.js does not copy `.next/static` or `public` into `.next/standalone` by default.

**Fix:** Ensure you run a full build before packaging. The project’s `npm run build` now runs `scripts/copy-standalone-static.js` after `next build`, which copies `.next/static` and `public` into `.next/standalone`. Then run `npm run electron:build` (or `electron:pack`). If you had run `next build` before this fix, run **`npm run build`** again (so the copy step runs), then rebuild the Electron app.

### Blank screen / How to register the first admin user

If the app window stays blank, the Next.js server may still be starting. The app now waits for the server and then opens the **login** page; on first run you are redirected to **Setup** to create the first admin (email + password).

- **Wait and refresh:** Give it 10–15 seconds, then press **Ctrl+R** (Windows) or **Cmd+R** (Mac) to reload the window. You should see either the **Login** or **Setup** page.
- **Use a browser:** With the app running, open a browser and go to **http://localhost:3000/setup** (or **http://localhost:3000/login**). Create the admin account on the setup page, then you can use the app window or the browser to log in.
- **Direct setup URL:** If the app window never shows content, use the browser method above to register; after that, the app window should work on next launch.

### First-run Postgres install (packaged app)

When the app is built **with** PostgreSQL binaries bundled:

1. On first launch, the app creates `%APPDATA%\<ProductName>\pgdata` and runs `initdb`.
2. It starts Postgres, creates the database `zet_asociatie` and sets a generated password for user `postgres`.
3. It runs SQL migrations from `db/migrations/`.
4. It writes `%APPDATA%\<ProductName>\config.json` with `localDbUrl`, `postgresBin`, `postgresDataDir`, `jwtSecret`, `encryptionSalt`.
5. On later launches it loads this config and starts Postgres + Next.js without running setup again.

**To bundle Postgres** so the above runs automatically:

1. Download PostgreSQL 17 Windows x64 binaries (e.g. [EnterpriseDB](https://www.enterprise-db.com/downloads/postgres-postgresql-downloads) or [postgresql.org](https://www.postgresql.org/download/windows/)).
2. Extract so that `resources/postgres-win/bin/` contains `initdb.exe` and `postgres.exe` (see `resources/postgres-win/README.txt`).
3. Run `npm run build` then `npm run electron:build`.

If `resources/postgres-win` only contains the README (no binaries), the app still builds; first-run will not install Postgres. Configure `POSTGRES_BIN` and `POSTGRES_DATA_DIR` manually or use an existing Postgres install.

### Running in development

1. **Env and DB:** From the project root, run `node scripts/generate-env.js` to create `.env.local` with `LOCAL_DB_URL`, `JWT_SECRET`, and `ENCRYPTION_SALT`. Create the DB (`createdb zet_asociatie`), then `npm run migrate:local`. See main README for full steps.
2. Start Next.js: `npm run dev`
3. Start Electron: `npm install --save-dev electron electron-builder --legacy-peer-deps` then `npm run electron:dev`

Postgres is not started by Electron in dev unless you set `POSTGRES_BIN` and `POSTGRES_DATA_DIR` (or have run the packaged app once so config exists). Use a local Postgres instance and `.env.local` for development.

### Building the Windows installer

Do this **on a Windows machine** (see “Build standalone on Windows” above):

```bash
npm run build              # Next.js standalone build
npm run electron:build     # electron-builder for Windows x64
```

Output: `dist-electron/` (e.g. NSIS installer).

### Building for macOS (DMG)

Do this **on a Mac**. electron-builder cannot produce valid macOS apps when run on Windows.

```bash
npm run build                  # Next.js production build
npm run electron:build:mac     # Creates .dmg (and .app) in dist-electron/
```

Or unpacked app only (no installer):

```bash
npm run electron:pack:mac      # dist-electron/mac-unpacked/Zet Asociatie.app
```

Output: `dist-electron/` — e.g. `Zet Asociatie-0.1.0.dmg` and `Zet Asociatie.app`. Postgres bundling in this repo is set up for Windows; on Mac use a system or Homebrew Postgres or env config.

**If `npm run build` fails with a Tailwind error** (e.g. `E.map is not a function` in `globals.css`), try: `rm -rf .next node_modules/.cache` and run `npm run build` again. If it still fails, it may be a Tailwind 4 + Next 16 compatibility issue in this environment; run the build on another machine or in CI.

### Troubleshooting: "ffmpeg.dll was not found"

This error means the app’s Electron runtime is missing `ffmpeg.dll` (used by Chromium for media). Even when the build is done **on Windows**, it can still happen. Try the following.

- **1. Run the unpacked build first**  
  Build without the installer to confirm the DLL is present:
  ```bash
  npm run build
  npm run electron:pack
  ```
  Open `dist-electron\win-unpacked\`. Run `Zet Asociatie.exe` from that folder. Check whether `ffmpeg.dll` (or the whole Electron runtime) is next to the exe or under `resources\`. If it works here but not after NSIS install, the installer is likely stripping or moving files.

- **2. Antivirus / Windows Defender**  
  Some security software quarantines or deletes `ffmpeg.dll`. Add an exclusion for the app folder (e.g. `C:\Program Files\Zet Asociatie` or `dist-electron\win-unpacked`) or temporarily disable real-time protection, then rebuild/reinstall and run again.

- **3. Run from the installed location**  
  After installing via the NSIS installer, start the app from the Start Menu or from e.g. `C:\Program Files\Zet Asociatie\`. Do not copy only the `.exe` elsewhere; the `.exe` must stay with the rest of the files (DLLs, `resources\`).

- **4. Reinstall**  
  Uninstall completely, then run the installer again so all runtime files are written correctly.

### Troubleshooting: "Invalid file descriptor to ICU data received" (icu_util.cc)

This error means Chromium’s ICU data (e.g. `icudtl.dat`) is missing or not loadable. It often appears when **both** Windows and Mac builds fail.

- **Build each platform on its own OS.**  
  - **Windows build** → run `npm run build` and `npm run electron:build` on a **Windows** machine.  
  - **Mac build** → run the same on a **Mac**.  
  Building Windows on Mac (or Mac on Windows) can produce installers that lack the correct ICU/runtime files, so the app crashes with this error on launch.

- **Don’t run the wrong executable.**  
  Use the Windows build (e.g. `Zet Asociatie Setup x.x.x.exe` or `win-unpacked\Zet Asociatie.exe`) only on Windows. Use the Mac build (`.app` or `.dmg`) only on macOS.

- **Clean rebuild.**  
  Delete `dist-electron/` and `node_modules`, run `npm install` and `npm run build`, then `npm run electron:build` again on the **target** OS.

If you need both Windows and Mac installers, build once on a Windows PC and once on a Mac (or use CI: e.g. GitHub Actions with a Windows runner and a macOS runner).

