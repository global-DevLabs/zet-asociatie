# Supabase → Tauri + SQLite Migration Guide

## Overview

This document describes the database structure and migration path from **Next.js + Supabase (PostgreSQL)** to **Tauri + SQLite** for a standalone, offline, embedded Windows build.

## Table Mapping

| Supabase Table | SQLite Table | Notes |
|----------------|--------------|-------|
| `auth.users` | `profiles` | Local auth; password_hash for bcrypt/argon2 |
| `profiles` | `profiles` | Extended with password_hash |
| `members` | `members` | Same schema, snake_case columns |
| `payments` | `payments` | payment_code as PK |
| `um_units` | `um_units` | Same |
| `activity_types` | `activity_types` | Same |
| `activities` | `activities` | Same |
| `activity_participants` | `activity_participants` | Same |
| `whatsapp_groups` | `whatsapp_groups` | Same |
| `whatsapp_group_members` | `whatsapp_group_members` | Same |
| `audit_logs` | `audit_logs` | Same |
| `member_search` (FTS) | `members_fts` (FTS5) | SQLite FTS5 virtual table |

## PostgreSQL RPC → SQLite Replacements

### 1. `get_next_member_code` → SQL

```sql
-- Returns next 5-digit member code (e.g. "01047")
UPDATE _sequences SET value = value + 1 WHERE name = 'member_code';
SELECT printf('%05d', value) FROM _sequences WHERE name = 'member_code';
```

**Alternative (single statement):**
```sql
INSERT INTO _sequences (name, value) VALUES ('member_code', 1)
ON CONFLICT(name) DO UPDATE SET value = value + 1
RETURNING printf('%05d', value);
```

### 2. `get_next_member_codes(count)` → SQL

```sql
-- Bulk: generate N member codes
UPDATE _sequences SET value = value + ? WHERE name = 'member_code';
SELECT printf('%05d', value - ? + 1) FROM _sequences, (SELECT value FROM _sequences WHERE name = 'member_code' LIMIT 1);
-- Or: generate in loop/client using single get_next_member_code
```

### 3. `get_next_payment_code` → SQL

```sql
-- Returns P-000001, P-000002, etc.
UPDATE _sequences SET value = value + 1 WHERE name = 'payment_code';
SELECT 'P-' || printf('%06d', value) FROM _sequences WHERE name = 'payment_code';
```

### 4. `search_members_fulltext(search_query)` → SQLite FTS5

```sql
-- Full-text search via members_fts
SELECT m.id FROM members m
JOIN members_fts fts ON m.rowid = fts.rowid
WHERE members_fts MATCH ?
ORDER BY rank;
```

**Fallback (simple LIKE search, no FTS):**
```sql
SELECT id FROM members
WHERE member_code LIKE '%' || ? || '%'
   OR first_name LIKE '%' || ? || '%'
   OR last_name LIKE '%' || ? || '%'
   OR lower(rank) LIKE '%' || lower(?) || '%'
   OR lower(unit) LIKE '%' || lower(?) || '%'
   OR lower(email) LIKE '%' || lower(?) || '%'
   OR phone LIKE '%' || ? || '%';
```

### 5. `refresh_member_search_index` → N/A

SQLite FTS5 is kept in sync automatically via triggers. No refresh needed.

## Column Naming: camelCase ↔ snake_case

Your stores already use `dbRowToMember`, `memberToDbRow`, etc. Keep the same mapping:

| TypeScript (camelCase) | SQLite (snake_case) |
|------------------------|---------------------|
| memberCode | member_code |
| firstName | first_name |
| lastName | last_name |
| dateOfBirth | date_of_birth |
| mainProfile | main_profile |
| ... | ... |

## Auth Migration: Supabase Auth → Local Auth

For standalone offline (Tauri):

1. **Supabase Auth** is bypassed when `isTauri()` is true.
2. **Local auth** uses the `profiles` table:
   - `password_hash`: bcrypt hash (bcryptjs, 10 rounds)
   - Session: `localStorage` key `tauri_auth_profile_id` (profile id)
3. **Default admin:** Seeded automatically on first run when no profiles exist:
   - Email: `admin@local`
   - Password: `admin123`
   - Role: `admin`

## Realtime Subscriptions → N/A

Supabase Realtime (postgres_changes) does not exist in SQLite. Replace with:

- **Manual refresh** after mutations (you already call `refreshMembers()` etc.)
- **Polling** if multi-window sync is needed
- **Tauri events** for cross-window communication

## File Structure

```
src-tauri/
├── migrations/
│   └── 001_initial_schema.sql    # This schema
├── src/
│   └── lib/
│       └── db.rs                 # SQLite init, migrations
└── Cargo.toml                    # tauri-plugin-sql
```

## Tauri Setup

1. Add `tauri-plugin-sql` to your Tauri project:
   ```toml
   [dependencies]
   tauri-plugin-sql = { version = "0.6", features = ["sqlite"] }
   ```

2. Initialize DB on app start:
   ```rust
   let db = tauri_plugin_sql::Builder::default()
       .add_db("sqlite:zet_asociatie.db")
       .build();
   ```

3. Run migrations from `src-tauri/migrations/`.

## Data Export from Supabase

1. Export each table as CSV from Supabase Dashboard.
2. Or use `pg_dump` for SQL:
   ```bash
   pg_dump --data-only -t members -t payments ... supabase_url > data.sql
   ```
3. Convert UUIDs and timestamps; load into SQLite with `.import` or a script.

## Security Notes for Standalone

- **Encryption:** Consider SQLCipher for encrypted SQLite if storing sensitive PII.
- **No network:** All data stays local; no cloud sync.
- **Backup:** Encourage periodic export/backup to file.

## Migration Status (Complete)

All stores and features use the db-adapter and work in both web (Supabase) and Tauri (SQLite) modes.

### Data & Auth
- **lib/db-adapter.ts**: `membersApi`, `paymentsApi`, `umUnitsApi`, `whatsappGroupsApi`, `memberGroupsApi`, `activitiesApi`, `auditLogsApi`, `authApi`, `profilesApi`
- **Stores**: members, payments, um-units, whatsapp-groups, member-groups, activities – all use adapters; Supabase realtime only when `!isTauri()`
- **audit-logger.ts**: Uses `auditLogsApi`
- **auth-context.tsx**: Local auth (profiles + bcrypt) when `isTauri()`, Supabase Auth when web

### API Fallbacks (Tauri static export = no server)
- **Member import**: `ImportModal` uses `membersApi.importMembers()` when `isTauri()`
- **Admin users**: `profilesApi.fetchProfiles()`, `createProfile()`, `updateProfile()` when `isTauri()`
- **Member search**: Client-side filtering (no API)

### Middleware
- **lib/supabase/middleware.ts**: Skips Supabase auth when `TAURI_ENV_PLATFORM` is set

### Build
```bash
# 1. Install Rust: https://rustup.rs/
# 2. Restart terminal or run: source ~/.cargo/env
# 3. Build:
npm run tauri:build
```

The Tauri build uses `scripts/tauri-build.js` as `beforeBuildCommand`: it temporarily moves `app/api` and `app/auth` out of the app directory (since static export doesn't support API routes), runs `next build`, then restores them. Dynamic routes use `generateStaticParams()` with placeholder params for static export compatibility.
