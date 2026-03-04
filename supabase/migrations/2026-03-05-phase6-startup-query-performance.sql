-- ============================================================
-- Phase 6: Startup Query Performance
-- Date: 2026-03-05
-- Safe for existing databases
-- ============================================================

CREATE INDEX IF NOT EXISTS profiles_is_active_idx
  ON public.profiles (is_active);

CREATE INDEX IF NOT EXISTS tasks_start_date_idx
  ON public.tasks (start_date);

CREATE INDEX IF NOT EXISTS tasks_created_by_idx
  ON public.tasks (created_by);
