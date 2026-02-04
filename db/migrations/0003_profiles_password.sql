-- Add password_hash to profiles for local auth (bcrypt).
-- Existing rows: password_hash stays NULL until user sets password or is created via register.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN profiles.password_hash IS 'bcrypt hash for local login; NULL for legacy/imported profiles.';
