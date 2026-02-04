# zet-asociatie

management membri

## Environment configuration (migration scaffolding)

The following environment variables are **introduced for the future local/offline migration**
but are **not required for the current Supabase-backed app**:

- `USE_LOCAL_DB` – set to `"true"` to enable the local PostgreSQL path (default: unset/`false`).
- `LOCAL_DB_URL` – PostgreSQL connection string for the local instance, used only when `USE_LOCAL_DB="true"`.
- `JWT_SECRET` – secret for signing/verifying JWTs in the local auth flow.
- `ENCRYPTION_SALT` – salt value for deriving application-level encryption keys (AES-256) from user secrets.

If you are running the existing cloud/Supabase version only, you can safely ignore these.

## Electron (desktop app) scaffolding

Basic Electron support has been added but is **not required** to run the web app.

- Main process entry: `electron/main.js`
- Preload script (context isolation enabled): `electron/preload.js`

To use Electron locally you will need to install the dev dependencies first:

```bash
npm install --save-dev electron electron-builder
```

Then, with your Next.js app running (e.g. `npm run dev`), you can start the desktop shell:

```bash
npm run electron:dev
```

By default it opens `http://localhost:3000` in a secure Electron window.


