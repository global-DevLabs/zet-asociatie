## Electron integration overview

- `electron/main.js` – main process: first-run Postgres setup, then starts Postgres + Next.js and opens the app window.
- `electron/postgres-setup.js` – first-run logic: initdb, create DB, run migrations, write config (when Postgres is bundled).
- `electron/preload.js` – preload with `contextIsolation: true`, no Node in renderer.

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

```bash
npm run build              # Next.js standalone build
npm run electron:build     # electron-builder for Windows x64
```

Output: `dist-electron/` (e.g. NSIS installer).

