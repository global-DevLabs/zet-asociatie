import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

/**
 * Get the database path - uses electron app.getPath() if available
 * Falls back to a local data directory otherwise
 */
function getDatabasePath(): string {
  let dataPath: string;

  try {
    // Try to use electron app path if available
    const { app } = require("electron");
    dataPath = app.getPath("userData");
  } catch {
    // Fallback for development/non-electron environments
    // Try multiple possible data directories
    const potentialPaths = [
      process.env.APPDATA ? path.join(process.env.APPDATA, "zet-asociatie") : null,
      process.env.HOME ? path.join(process.env.HOME, ".zet-asociatie") : null,
      path.join(process.cwd(), "data"),
    ].filter(Boolean) as string[];

    dataPath = potentialPaths[0] || path.join(process.cwd(), "data");
  }

  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  return path.join(dataPath, "app.db");
}

/**
 * Initialize the database connection and create tables if needed
 */
export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
  createTables(db);

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

function createTables(database: Database.Database): void {
  const tables = [
    // Auth table - for local authentication
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Profiles table
    `CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Members table
    `CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      member_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'Activ',
      rank TEXT,
      first_name TEXT,
      last_name TEXT,
      date_of_birth TEXT,
      cnp TEXT,
      birthplace TEXT,
      unit TEXT,
      main_profile TEXT,
      retirement_year INTEGER,
      retirement_decision_number TEXT,
      retirement_file_number TEXT,
      branch_enrollment_year INTEGER,
      branch_withdrawal_year INTEGER,
      branch_withdrawal_reason TEXT,
      withdrawal_reason TEXT,
      withdrawal_year INTEGER,
      provenance TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      whatsapp_group_ids TEXT,
      organization_involvement TEXT,
      magazine_contributions TEXT,
      branch_needs TEXT,
      foundation_needs TEXT,
      other_needs TEXT,
      car_member_status TEXT,
      foundation_member_status TEXT,
      foundation_role TEXT,
      has_current_workplace INTEGER,
      current_workplace TEXT,
      other_observations TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Activities table
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type_id TEXT NOT NULL,
      title TEXT,
      date_from TEXT,
      date_to TEXT,
      location TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      archived_at TEXT,
      archived_by TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      participants_count INTEGER DEFAULT 0,
      FOREIGN KEY (type_id) REFERENCES activity_types(id)
    )`,

    // Activity types table
    `CREATE TABLE IF NOT EXISTS activity_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Activity participants table
    `CREATE TABLE IF NOT EXISTS activity_participants (
      activity_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      status TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (activity_id, member_id),
      FOREIGN KEY (activity_id) REFERENCES activities(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`,

    // Payments table
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      amount REAL,
      payment_type TEXT,
      method TEXT,
      status TEXT,
      year INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`,

    // WhatsApp groups table
    `CREATE TABLE IF NOT EXISTS whatsapp_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_url TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // WhatsApp group members table
    `CREATE TABLE IF NOT EXISTS whatsapp_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      member_id TEXT,
      phone_number TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES whatsapp_groups(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`,

    // Units/UM Units table
    `CREATE TABLE IF NOT EXISTS um_units (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // Audit logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action_type TEXT NOT NULL,
      module TEXT,
      summary TEXT,
      metadata TEXT,
      is_error INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
  ];

  // Create indexes for better query performance
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code)",
    "CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)",
    "CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type_id)",
    "CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status)",
    "CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)",
  ];

  tables.forEach((sql) => {
    database.exec(sql);
  });

  indexes.forEach((sql) => {
    database.exec(sql);
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
