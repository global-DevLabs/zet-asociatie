-- Seed counters table for get_next_member_code / get_next_payment_code.
-- Supabase uses entity_type 'member' and 'payment'; initial values can be 0 or higher.

INSERT INTO counters (entity_type, current_value, updated_at)
VALUES
  ('member', 0, now()),
  ('payment', 0, now())
ON CONFLICT (entity_type) DO NOTHING;
