## Electron integration overview

- `electron/main.js` – main process: first-run Postgres setup, then starts Postgres + Next.js and opens the app window.
- `electron/postgres-setup.js` – first-run logic: initdb, create DB, run migrations, write config (when Postgres is bundled).
- `electron/preload.js` – preload with `contextIsolation: true`, no Node in renderer.

### Windows build requirements (dependencies)

To **build** the app on Windows (not just run the installed .exe), the machine needs:

| Requirement | Purpose |
|-------------|--------|
| **Node.js 18+** | Runtime for npm, Next.js, Electron. |
| **npm** | Comes with Node. |
| **Python 3.x** | Required by node-gyp for native modules (e.g. some npm dependencies). Install from [python.org](https://www.python.org/downloads/) or Microsoft Store; add to PATH. Then: `npm config set python "C:\Path\To\python.exe"`. |
| **Visual Studio Build Tools** (or VS with C++) | Provides compiler for native addons. Install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with workload **"Desktop development with C++"**. Then set: `npm config set msvs_version 2022` (or `2019`). |
| **Visual C++ Redistributable** (for PCs that only *run* the app) | If end users get errors about missing DLLs, install [VC++ Redistributable x64](https://aka.ms/vs/17/release/vc_redist.x64.exe) on the target PC. |

**Verification script (run before building):**

```bash
npm run verify:windows-env
```

This checks: `node -v`, `npm -v`, `npm config get python`, `npm config get msvs_version`, and optionally `where python` on Windows. It does not install anything; it reports what is missing and gives hints. Fix any ✗ items before `npm install` / `npm run build`.

### Build standalone on Windows (for Windows)

Do this **on a Windows machine** to produce a Windows installer (standalone app):

1. **Prerequisites:** Node.js (v18+), npm, and (for native modules) Python + Visual Studio Build Tools as above. Run `npm run verify:windows-env` to confirm.
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
   This runs `version:bump` first (increments the patch version in `package.json`, e.g. 0.1.1 → 0.1.2), then builds the installer.
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

**Important (bundled Postgres):** Do **not** run the app as Administrator (e.g. right‑click → “Run as administrator”). PostgreSQL refuses to start when run with administrative permissions. Start the app as a normal user. If you must run the app as Administrator, use [external Postgres](#using-an-existing-postgresql-install-postgres-first-eg-password-zet2026) instead (install Postgres, set `LOCAL_DB_URL`).

### Using an existing PostgreSQL (install Postgres first, e.g. password Zet2026)

You can install PostgreSQL yourself and have the app use it instead of the bundled one:

1. **Install PostgreSQL** (e.g. from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) or EnterpriseDB). During setup, set the **postgres** user password (e.g. **Zet2026**).
2. **Before the first run of Zet Asociatie**, set the environment variable **LOCAL_DB_URL** so the app can connect and create the database:
   - URL format: `postgres://postgres:PASSWORD@127.0.0.1:5432/postgres`  
     Example for password **Zet2026**: `postgres://postgres:Zet2026@127.0.0.1:5432/postgres`
   - The app will connect to the default `postgres` database, create the database `zet_asociatie` if it does not exist, run migrations, and write config to `%APPDATA%\zet_asociatie\config.json`. It will **not** start or use the bundled Postgres.
3. **How to set LOCAL_DB_URL on Windows:**
   - **Option A – System environment (permanent):**  
     Win+R → `sysdm.cpl` → Advanced → Environment Variables. Under “User” or “System”, add variable `LOCAL_DB_URL` = `postgres://postgres:Zet2026@127.0.0.1:5432/postgres`. Restart the app (or log off/on if needed).
   - **Option B – Batch file to launch the app:**  
     Create a `.bat` file next to the app (e.g. `Start Zet Asociatie.bat`) with:
     ```bat
     set LOCAL_DB_URL=postgres://postgres:Zet2026@127.0.0.1:5432/postgres
     "C:\Program Files\Zet Asociatie\Zet Asociatie.exe"
     ```
     Run the batch file to start the app. The variable is set only for that run.
4. **Optional:** You can also set `JWT_SECRET` and `ENCRYPTION_SALT` (e.g. long random strings). If you do not set them, the app generates them and stores them in config.

After the first successful run, config is saved; you can start the app normally (no need to set `LOCAL_DB_URL` again unless you reinstall or delete the config).

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

### Troubleshooting: "NSIS Error" / Cannot uninstall previous version

The Windows build uses an **assisted installer** (`oneClick: false`) so the uninstaller is created and registered in a standard way; this reduces "Installer integrity check has failed" issues. If you still see that error (e.g. from an older one-click build), remove the app manually:

1. **Close the app** if it is running (Task Manager → end "Zet Asociatie" if needed).

2. **Delete the install folder**  
   - Open File Explorer and go to `C:\Program Files\` (or `C:\Program Files (x86)\` if you used a 32‑bit install).  
   - Delete the folder **Zet Asociatie** (right‑click → Delete; use "Continue" if Windows asks for admin rights).

3. **Remove the uninstaller entry** (optional)  
   - Settings → Apps → Installed apps → find "Zet Asociatie" → Uninstall. If it fails again, ignore it; the app files are already gone.  
   - Or run `appwiz.cpl`, find "Zet Asociatie", select it, click Uninstall. If you get the same NSIS error, the entry may remain until you remove it via a registry fix or leave it; it will point to a missing path after you deleted the folder.

4. **App data (optional)**  
   - To remove saved data and config (database, config.json): open Run (Win+R), type `%APPDATA%`, press Enter, then delete the folder **Zet Asociatie** if you want a full clean slate.  
   - If you keep this folder, a new install will reuse the existing config and database.

5. **Reinstall**  
   - Run the new installer (e.g. `Zet Asociatie Setup 0.1.1.exe`) to install again.

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

