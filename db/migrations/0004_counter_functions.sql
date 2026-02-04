-- get_next_member_code: increment counter for 'member', return 5-digit text (e.g. 01046)
CREATE OR REPLACE FUNCTION get_next_member_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val integer;
BEGIN
  UPDATE counters
  SET current_value = current_value + 1,
      updated_at = now()
  WHERE entity_type = 'member'
  RETURNING current_value INTO next_val;

  IF next_val IS NULL THEN
    INSERT INTO counters (entity_type, current_value, updated_at)
    VALUES ('member', 1, now())
    ON CONFLICT (entity_type) DO UPDATE
    SET current_value = counters.current_value + 1, updated_at = now()
    RETURNING current_value INTO next_val;
  END IF;

  RETURN lpad(next_val::text, 5, '0');
END;
$$;

-- get_next_payment_code: increment counter for 'payment', return P-######
CREATE OR REPLACE FUNCTION get_next_payment_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val integer;
BEGIN
  UPDATE counters
  SET current_value = current_value + 1,
      updated_at = now()
  WHERE entity_type = 'payment'
  RETURNING current_value INTO next_val;

  IF next_val IS NULL THEN
    INSERT INTO counters (entity_type, current_value, updated_at)
    VALUES ('payment', 1, now())
    ON CONFLICT (entity_type) DO UPDATE
    SET current_value = counters.current_value + 1, updated_at = now()
    RETURNING current_value INTO next_val;
  END IF;

  RETURN 'P-' || lpad(next_val::text, 6, '0');
END;
$$;

-- get_next_member_codes(count): bulk member codes for import
CREATE OR REPLACE FUNCTION get_next_member_codes(count integer)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  start_val integer;
  i integer;
  codes text[] := '{}';
BEGIN
  IF count IS NULL OR count < 1 THEN
    RETURN codes;
  END IF;

  INSERT INTO counters (entity_type, current_value, updated_at)
  VALUES ('member', count, now())
  ON CONFLICT (entity_type) DO UPDATE
  SET current_value = counters.current_value + count, updated_at = now();

  SELECT (current_value - count + 1) INTO start_val
  FROM counters WHERE entity_type = 'member';

  FOR i IN 0..(count - 1) LOOP
    codes := array_append(codes, lpad((start_val + i)::text, 5, '0'));
  END LOOP;

  RETURN codes;
END;
$$;
