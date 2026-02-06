# Fresh install checklist

Use this when setting up the app on a **new machine or empty database**.

## Option A: Dev (Node + existing Postgres)

- [ ] PostgreSQL installed and running
- [ ] `createdb zet_asociatie` (or create DB manually)
- [ ] `node scripts/generate-env.js` → edit `.env.local` if needed (user, password, port)
- [ ] `npm run migrate:local` (applies 0001–0006)
- [ ] `npm run dev` → open http://localhost:3000
- [ ] You are redirected to **/setup** → create first admin (email + password)
- [ ] Log in and use the app

**Verify migrations:** `npm run migrate:check` (expect: "Migrations OK: 6 files")

## Option B: Electron with bundled Postgres (Windows)

- [ ] Build: `npm run build` then `npm run electron:build`
- [ ] (Optional) Place Postgres 17 binaries in `resources/postgres-win/bin/`
- [ ] Install and run the app **as a normal user** (not Administrator)
- [ ] First launch: app creates DB, runs migrations 0001–0006, writes config to `%APPDATA%\Admin Membri\`
- [ ] Open **Setup** (or go to /setup) → create first admin
- [ ] Later launches: app starts Postgres and Next.js; no setup again

**If the app closes immediately:** check `%APPDATA%\Admin Membri\debug.log`

## Option C: Electron with existing Postgres

- [ ] Install PostgreSQL; note the **postgres** user password
- [ ] Set env before first run: `LOCAL_DB_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/postgres`
- [ ] Start the app once; it creates `zet_asociatie`, role `zet_app`, runs migrations, writes config
- [ ] Create first admin on **Setup** page
- [ ] Next runs: start the app normally (config is saved)

## After first user

- First user is **admin**. Create more users via Admin → Users (or `POST /api/auth/register` as admin).
- Schema reference: `db/schema.sql`
- Migrations: `db/migrations/0001_*.sql` … `0006_*.sql`
