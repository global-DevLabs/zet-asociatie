-- =============================================================================
-- Zet Asociatie - SQLite Schema for Tauri Migration
-- Migrated from Supabase/PostgreSQL
-- =============================================================================

-- Enable foreign keys (SQLite default is OFF)
PRAGMA foreign_keys = ON;

-- =============================================================================
-- SEQUENCES / AUTO-INCREMENT HELPERS (via sqlite_sequence)
-- Member code: 5-digit numeric (01046)
-- Payment code: P-###### format
-- Activity ID: ACT-#### format
-- WhatsApp Group: wag-### format
-- =============================================================================

-- =============================================================================
-- 1. PROFILES (local users for standalone auth - replaces Supabase auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active INTEGER NOT NULL DEFAULT 1,   -- SQLite: 1=true, 0=false
  password_hash TEXT,                     -- For local auth (bcrypt/argon2)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================================================
-- 2. MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,                    -- UUID
  member_code TEXT NOT NULL UNIQUE,       -- 5-digit: 01046
  status TEXT DEFAULT 'Activ' CHECK (status IN ('Activ', 'Retras')),
  
  -- Personal
  rank TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,
  cnp TEXT,
  birthplace TEXT,
  unit TEXT NOT NULL,
  main_profile TEXT NOT NULL,
  
  -- Retirement
  retirement_year INTEGER,
  retirement_decision_number TEXT,
  retirement_file_number TEXT,
  
  -- Branch
  branch_enrollment_year INTEGER,
  branch_withdrawal_year INTEGER,
  branch_withdrawal_reason TEXT,
  withdrawal_reason TEXT CHECK (withdrawal_reason IN (
    'Retras la cerere', 'Plecat în alt județ', 'Reactivat', 'Decedat',
    'Exclus disciplinar', 'Neplată cotizație'
  )),
  withdrawal_year INTEGER,
  provenance TEXT,
  
  -- Contact
  address TEXT,
  phone TEXT,
  email TEXT,
  
  -- Qualitative
  whatsapp_group_ids TEXT,                -- JSON array: ["wag-001", "wag-002"]
  organization_involvement TEXT,
  magazine_contributions TEXT,
  branch_needs TEXT,
  foundation_needs TEXT,
  other_needs TEXT,
  
  -- Observations
  car_member_status TEXT CHECK (car_member_status IN ('Da', 'Nu')),
  foundation_member_status TEXT CHECK (foundation_member_status IN ('Da', 'Nu')),
  foundation_role TEXT,
  has_current_workplace TEXT CHECK (has_current_workplace IN ('Da', 'Nu')),
  current_workplace TEXT,
  other_observations TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_last_name ON members(last_name);
CREATE INDEX IF NOT EXISTS idx_members_first_name ON members(first_name);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_unit ON members(unit);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Full-text search for members (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS members_fts USING fts5(
  member_code,
  first_name,
  last_name,
  rank,
  unit,
  email,
  phone,
  content='members',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS members_ai AFTER INSERT ON members BEGIN
  INSERT INTO members_fts(rowid, member_code, first_name, last_name, rank, unit, email, phone)
  VALUES (new.rowid, new.member_code, new.first_name, new.last_name, new.rank, new.unit, new.email, new.phone);
END;
CREATE TRIGGER IF NOT EXISTS members_ad AFTER DELETE ON members BEGIN
  INSERT INTO members_fts(members_fts, rowid, member_code, first_name, last_name, rank, unit, email, phone)
  VALUES ('delete', old.rowid, old.member_code, old.first_name, old.last_name, old.rank, old.unit, old.email, old.phone);
END;
CREATE TRIGGER IF NOT EXISTS members_au AFTER UPDATE ON members BEGIN
  INSERT INTO members_fts(members_fts, rowid, member_code, first_name, last_name, rank, unit, email, phone)
  VALUES ('delete', old.rowid, old.member_code, old.first_name, old.last_name, old.rank, old.unit, old.email, old.phone);
  INSERT INTO members_fts(rowid, member_code, first_name, last_name, rank, unit, email, phone)
  VALUES (new.rowid, new.member_code, new.first_name, new.last_name, new.rank, new.unit, new.email, new.phone);
END;

-- =============================================================================
-- 3. PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  payment_code TEXT PRIMARY KEY,          -- P-######
  member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Numerar', 'Card / Online', 'Transfer Bancar')),
  status TEXT NOT NULL CHECK (status IN ('Plătită', 'Scadentă', 'Restanță')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Taxă de înscriere', 'Cotizație', 'Taxă de reînscriere')),
  contribution_year INTEGER,
  observations TEXT,
  source TEXT,
  receipt_number TEXT,
  legacy_payment_id TEXT,                 -- PAY-MEM-####-####
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);

-- =============================================================================
-- 4. UM UNITS (military units)
-- =============================================================================
CREATE TABLE IF NOT EXISTS um_units (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,              -- UM 0754
  name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_um_units_code ON um_units(code);
CREATE INDEX IF NOT EXISTS idx_um_units_is_active ON um_units(is_active);

-- =============================================================================
-- 5. ACTIVITY TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- 6. ACTIVITIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,                    -- ACT-0001
  type_id TEXT NOT NULL,
  title TEXT,
  date_from TEXT NOT NULL,
  date_to TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  archived_at TEXT,
  archived_by TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (type_id) REFERENCES activity_types(id)
);

CREATE INDEX IF NOT EXISTS idx_activities_type_id ON activities(type_id);
CREATE INDEX IF NOT EXISTS idx_activities_date_from ON activities(date_from);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- =============================================================================
-- 7. ACTIVITY PARTICIPANTS (many-to-many)
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_participants (
  activity_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attended' CHECK (status IN ('invited', 'attended', 'organizer')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (activity_id, member_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_participants_member ON activity_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity ON activity_participants(activity_id);

-- =============================================================================
-- 8. WHATSAPP GROUPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id TEXT PRIMARY KEY,                    -- wag-001
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- 9. WHATSAPP GROUP MEMBERS (many-to-many)
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_group_members (
  member_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  added_by TEXT,
  notes TEXT,
  PRIMARY KEY (member_id, group_id),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES whatsapp_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_group_members_group ON whatsapp_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_members_member ON whatsapp_group_members(member_id);

-- =============================================================================
-- 10. AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,                    -- AUDIT-{timestamp}-{random}
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  actor_user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_code TEXT,
  summary TEXT NOT NULL,
  metadata TEXT,                          -- JSON
  user_agent TEXT,
  request_id TEXT,
  is_error INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- =============================================================================
-- CODE SEQUENCES (for generating codes)
-- SQLite doesn't have sequences; we use a simple table
-- =============================================================================
CREATE TABLE IF NOT EXISTS _sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO _sequences (name, value) VALUES ('member_code', 0);
INSERT OR IGNORE INTO _sequences (name, value) VALUES ('payment_code', 0);

-- =============================================================================
-- DEFAULT ACTIVITY TYPE (optional seed)
-- =============================================================================
-- INSERT OR IGNORE INTO activity_types (id, name, is_active) 
-- VALUES ('atype-default', 'Activitate generală', 1);
