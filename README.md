# zet-asociatie

Management membri – local PostgreSQL and JWT auth (no Supabase).

## Running with local Postgres

The app uses a **local PostgreSQL** database and **JWT-based auth** (no Supabase). You need a running Postgres instance and env credentials.

### 1. Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (e.g. 15+) installed and running
- Create the database (if it doesn’t exist):

  ```bash
  createdb zet_asociatie
  ```

  Or in `psql`: `CREATE DATABASE zet_asociatie;`

### 2. Generate DB credentials and env

Generate a `.env.local` file with random **JWT_SECRET** and **ENCRYPTION_SALT** and a default **LOCAL_DB_URL**:

```bash
node scripts/generate-env.js
```

This creates `.env.local` with:

- **LOCAL_DB_URL** – `postgresql://postgres:postgres@localhost:5432/zet_asociatie` (change user/password if needed)
- **JWT_SECRET** – random 64-char hex
- **ENCRYPTION_SALT** – random 48-char hex

Edit `.env.local` if your Postgres user, password, host, or database name differ.

Alternatively, copy the example and set values yourself:

```bash
cp .env.example .env.local
# Edit .env.local: set LOCAL_DB_URL, JWT_SECRET (min 32 chars), ENCRYPTION_SALT (min 16 chars)
```

To generate secrets manually:

```bash
# JWT_SECRET (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_SALT (48 hex chars)
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 3. Run migrations

```bash
npm run migrate:local
```

Or:

```bash
node scripts/migrate.js
```

Migrations read `LOCAL_DB_URL` from `.env.local` if the file exists.

### 4. Install dependencies and start the app

```bash
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000`. You will be redirected to **/login** until a user exists.

### 5. Create the first user (admin)

The first user must be created via the **register** API (no existing users = no auth required for register).

Using curl:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-secure-password","full_name":"Admin","role":"admin"}'
```

Or use another HTTP client (Postman, etc.). The response sets an HTTP-only auth cookie; you can then use the app in the browser.

To create more users later, log in as an admin and use the Admin → Users UI, or call `POST /api/auth/register` again while authenticated as admin.

### Env reference

| Variable          | Required | Description |
|-------------------|----------|-------------|
| `LOCAL_DB_URL`    | Yes      | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/zet_asociatie` |
| `JWT_SECRET`      | Yes      | Secret for signing JWTs (min 32 chars). Use a random value in production. |
| `ENCRYPTION_SALT` | Yes      | Salt for app-level encryption key derivation (min 16 chars). Use a random value in production. |

---

## Electron (desktop app)

Basic Electron support is available for a packaged desktop app (e.g. Windows).

- Main process: `electron/main.js` – first-run Postgres setup, then starts Postgres + Next.js and opens the window.
- Preload: `electron/preload.js` – context isolation enabled, no Node in renderer.

**Development:**

1. Start Next.js: `npm run dev`
2. Install Electron dev deps: `npm install --save-dev electron electron-builder --legacy-peer-deps`
3. Start Electron: `npm run electron:dev`

Postgres is not started by Electron in dev unless you set `POSTGRES_BIN` and `POSTGRES_DATA_DIR`, or use an existing local Postgres and `.env.local` as above.

**Packaged app (Windows):** See `electron/README-electron.md` for first-run Postgres install and bundling.

**Build Windows installer:**

```bash
npm run build
npm run electron:build
```

Output: `dist-electron/` (e.g. NSIS installer).
