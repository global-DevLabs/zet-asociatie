-- updated_at auto-set on UPDATE for members, payments, um_units, whatsapp_groups, activities.
-- All five tables have updated_at timestamptz in 0001_initial_schema.sql.

-- 1. Create the function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach to tables (idempotent: drop if exists then create)
DROP TRIGGER IF EXISTS set_updated_at_members ON members;
CREATE TRIGGER set_updated_at_members BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_payments ON payments;
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_um_units ON um_units;
CREATE TRIGGER set_updated_at_um_units BEFORE UPDATE ON um_units FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_whatsapp_groups ON whatsapp_groups;
CREATE TRIGGER set_updated_at_whatsapp_groups BEFORE UPDATE ON whatsapp_groups FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_activities ON activities;
CREATE TRIGGER set_updated_at_activities BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
