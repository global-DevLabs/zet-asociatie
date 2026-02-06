-- Schema improvements derived from full codebase analysis.
-- 1) Case-insensitive unique email on profiles (matches app: LOWER(email) = LOWER($1)).
-- 2) updated_at trigger for activity_types (consistent with other tables).

-- 1. Unique email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
  ON profiles (LOWER(email));

-- 2. updated_at trigger for activity_types (0005 already has handle_updated_at())
DROP TRIGGER IF EXISTS set_updated_at_activity_types ON activity_types;
CREATE TRIGGER set_updated_at_activity_types
  BEFORE UPDATE ON activity_types
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
