-- =============================================================================
-- SQLite Queries - Replacements for Supabase PostgreSQL RPCs
-- Use these from Tauri/Rust or via Tauri commands
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_next_member_code: Returns next 5-digit code (e.g. "01047")
-- Run as transaction: BEGIN; run update; run select; COMMIT;
-- -----------------------------------------------------------------------------
-- UPDATE _sequences SET value = value + 1 WHERE name = 'member_code';
-- SELECT printf('%05d', value) AS code FROM _sequences WHERE name = 'member_code';

-- -----------------------------------------------------------------------------
-- get_next_payment_code: Returns P-000001, P-000002, etc.
-- -----------------------------------------------------------------------------
-- UPDATE _sequences SET value = value + 1 WHERE name = 'payment_code';
-- SELECT 'P-' || printf('%06d', value) AS code FROM _sequences WHERE name = 'payment_code';

-- -----------------------------------------------------------------------------
-- search_members_fulltext: FTS5 search - returns member ids
-- Parameter: ? = search query (use * for prefix: "joh*" or "john smith")
-- -----------------------------------------------------------------------------
-- SELECT m.id FROM members m
-- JOIN members_fts fts ON m.rowid = fts.rowid
-- WHERE members_fts MATCH ?
-- ORDER BY rank;

-- -----------------------------------------------------------------------------
-- search_members_like: Fallback if FTS5 not available - simple LIKE search
-- Parameter: ? = search query (single term)
-- -----------------------------------------------------------------------------
-- SELECT id FROM members
-- WHERE member_code LIKE '%' || ? || '%'
--    OR first_name LIKE '%' || ? || '%'
--    OR last_name LIKE '%' || ? || '%'
--    OR (rank IS NOT NULL AND rank LIKE '%' || ? || '%')
--    OR (unit IS NOT NULL AND unit LIKE '%' || ? || '%')
--    OR (email IS NOT NULL AND email LIKE '%' || ? || '%')
--    OR (phone IS NOT NULL AND phone LIKE '%' || ? || '%');

-- -----------------------------------------------------------------------------
-- Initialize member_code sequence from existing max
-- Run once after importing data from Supabase
-- -----------------------------------------------------------------------------
-- INSERT OR REPLACE INTO _sequences (name, value)
-- SELECT 'member_code', COALESCE(MAX(CAST(member_code AS INTEGER)), 0)
-- FROM members WHERE member_code GLOB '[0-9]*';

-- -----------------------------------------------------------------------------
-- Initialize payment_code sequence from existing max
-- -----------------------------------------------------------------------------
-- INSERT OR REPLACE INTO _sequences (name, value)
-- SELECT 'payment_code', COALESCE(MAX(CAST(SUBSTR(payment_code, 4) AS INTEGER)), 0)
-- FROM payments WHERE payment_code LIKE 'P-%';
