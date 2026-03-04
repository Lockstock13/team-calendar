-- Phase 3 Validation Script
-- Run in Supabase SQL Editor (Role: postgres)
-- Purpose: verify schema reliability for notes + audit_logs.

-- ============================================================
-- 1) Table existence checks
-- ============================================================
SELECT to_regclass('public.notes') AS notes_table;
SELECT to_regclass('public.audit_logs') AS audit_logs_table;

DO $$
BEGIN
  IF to_regclass('public.notes') IS NULL THEN
    RAISE EXCEPTION 'Missing table: public.notes';
  END IF;

  IF to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'Missing table: public.audit_logs';
  END IF;
END $$;

-- ============================================================
-- 2) Required columns check (notes + audit_logs)
-- ============================================================
WITH required(table_name, col) AS (
  VALUES
    ('notes', 'id'),
    ('notes', 'title'),
    ('notes', 'content'),
    ('notes', 'category'),
    ('notes', 'note_type'),
    ('notes', 'pinned'),
    ('notes', 'created_by'),
    ('notes', 'updated_by'),
    ('notes', 'created_at'),
    ('notes', 'updated_at'),
    ('audit_logs', 'id'),
    ('audit_logs', 'action'),
    ('audit_logs', 'actor_id'),
    ('audit_logs', 'target_id'),
    ('audit_logs', 'route'),
    ('audit_logs', 'status'),
    ('audit_logs', 'details'),
    ('audit_logs', 'created_at')
)
SELECT r.table_name, r.col AS missing_column
FROM required r
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = r.table_name
 AND c.column_name = r.col
WHERE c.column_name IS NULL;

DO $$
DECLARE
  missing_count integer;
BEGIN
  WITH required(table_name, col) AS (
    VALUES
      ('notes', 'id'),
      ('notes', 'title'),
      ('notes', 'content'),
      ('notes', 'category'),
      ('notes', 'note_type'),
      ('notes', 'pinned'),
      ('notes', 'created_by'),
      ('notes', 'updated_by'),
      ('notes', 'created_at'),
      ('notes', 'updated_at'),
      ('audit_logs', 'id'),
      ('audit_logs', 'action'),
      ('audit_logs', 'actor_id'),
      ('audit_logs', 'target_id'),
      ('audit_logs', 'route'),
      ('audit_logs', 'status'),
      ('audit_logs', 'details'),
      ('audit_logs', 'created_at')
  )
  SELECT COUNT(*) INTO missing_count
  FROM required r
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = r.table_name
   AND c.column_name = r.col
  WHERE c.column_name IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Missing required columns: %', missing_count;
  END IF;
END $$;

-- ============================================================
-- 3) Policy checks
-- ============================================================
WITH expected(tablename, policyname) AS (
  VALUES
    ('notes', 'notes: read all'),
    ('notes', 'notes: insert own'),
    ('notes', 'notes: update own'),
    ('notes', 'notes: delete own'),
    ('notes', 'notes: admin update any'),
    ('notes', 'notes: admin delete any'),
    ('audit_logs', 'audit_logs: read own'),
    ('audit_logs', 'audit_logs: admin read all')
)
SELECT e.tablename, e.policyname AS missing_policy
FROM expected e
LEFT JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.tablename = e.tablename
 AND p.policyname = e.policyname
WHERE p.policyname IS NULL
ORDER BY e.tablename, e.policyname;

DO $$
DECLARE
  missing_policy_count integer;
BEGIN
  WITH expected(tablename, policyname) AS (
    VALUES
      ('notes', 'notes: read all'),
      ('notes', 'notes: insert own'),
      ('notes', 'notes: update own'),
      ('notes', 'notes: delete own'),
      ('notes', 'notes: admin update any'),
      ('notes', 'notes: admin delete any'),
      ('audit_logs', 'audit_logs: read own'),
      ('audit_logs', 'audit_logs: admin read all')
  )
  SELECT COUNT(*) INTO missing_policy_count
  FROM expected e
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = e.tablename
   AND p.policyname = e.policyname
  WHERE p.policyname IS NULL;

  IF missing_policy_count > 0 THEN
    RAISE EXCEPTION 'Missing required policies: %', missing_policy_count;
  END IF;
END $$;

-- ============================================================
-- 4) Index checks
-- ============================================================
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'notes_updated_at_idx',
    'notes_pinned_idx',
    'audit_logs_created_at_idx',
    'audit_logs_actor_id_idx'
  )
ORDER BY tablename, indexname;

-- ============================================================
-- 5) Audit logs quick sample (non-failing informational)
-- ============================================================
SELECT action, actor_id, target_id, status, created_at
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- 6) Final status marker
-- ============================================================
SELECT 'PHASE_3_SCHEMA_VALIDATION_OK' AS status;

