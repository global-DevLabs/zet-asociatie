-- Initial schema migration.
--
-- This mirrors the structure defined in db/schema.sql and is
-- inferred from the current Supabase usage in the application.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Activ',
  rank text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  cnp text,
  birthplace text,
  unit text,
  main_profile text,
  retirement_year integer,
  retirement_decision_number text,
  retirement_file_number text,
  branch_enrollment_date date,
  branch_withdrawal_date date,
  years_of_service integer DEFAULT 0,
  branch_enrollment_year integer,
  branch_withdrawal_year integer,
  branch_withdrawal_reason text,
  withdrawal_reason text,
  withdrawal_year integer,
  provenance text,
  address text,
  phone text,
  email text,
  whatsapp_group_ids text[],
  organization_involvement text,
  magazine_contributions text,
  branch_needs text,
  foundation_needs text,
  other_needs text,
  car_member_status text,
  foundation_member_status text,
  foundation_role text,
  has_current_workplace text,
  current_workplace text,
  other_observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_member_code_idx ON members (member_code);
CREATE INDEX IF NOT EXISTS members_last_first_name_idx ON members (last_name, first_name);

CREATE TABLE IF NOT EXISTS counters (
  entity_type text PRIMARY KEY,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS um_units (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS whatsapp_group_members (
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id text NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid,
  notes text,
  PRIMARY KEY (member_id, group_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_group_members_group_idx
  ON whatsapp_group_members (group_id);

CREATE TABLE IF NOT EXISTS activity_types (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS activities (
  id text PRIMARY KEY,
  type_id integer REFERENCES activity_types(id),
  title text,
  date_from date,
  date_to date,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  participants_count integer
);

CREATE TABLE IF NOT EXISTS activity_participants (
  activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status text DEFAULT 'attended' CHECK (status IN ('invited', 'attended', 'organizer')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, member_id)
);

CREATE INDEX IF NOT EXISTS activity_participants_member_idx
  ON activity_participants (member_id);

CREATE TABLE IF NOT EXISTS payments (
  id bigserial PRIMARY KEY,
  payment_code text UNIQUE NOT NULL,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  year integer,
  amount numeric(10, 2) NOT NULL,
  method text,
  status text DEFAULT 'Plătită',
  payment_type text,
  contribution_year integer,
  observations text,
  source text,
  receipt_number text,
  legacy_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_member_idx ON payments (member_id);
CREATE INDEX IF NOT EXISTS payments_payment_code_idx ON payments (payment_code);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  actor_user_id text NOT NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  entity_type text,
  entity_id text,
  entity_code text,
  summary text NOT NULL,
  metadata jsonb,
  user_agent text,
  request_id text,
  is_error boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx
  ON audit_logs (timestamp DESC);

