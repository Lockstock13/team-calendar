-- Phase 3: Data Schema Reliability
-- Safe to run multiple times.

-- 1) Notes table parity for fresh + existing DB
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT,
  category   TEXT NOT NULL DEFAULT 'umum'
              CHECK (category IN ('umum', 'keuangan', 'password', 'lainnya')),
  note_type  TEXT NOT NULL DEFAULT 'regular'
              CHECK (note_type IN ('regular', 'table')),
  pinned     BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'umum',
  ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS notes_updated_at_idx
  ON public.notes (updated_at DESC);

CREATE INDEX IF NOT EXISTS notes_pinned_idx
  ON public.notes (pinned, updated_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes: read all" ON public.notes;
CREATE POLICY "notes: read all"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "notes: insert own" ON public.notes;
CREATE POLICY "notes: insert own"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND auth.uid() = updated_by);

DROP POLICY IF EXISTS "notes: update own" ON public.notes;
CREATE POLICY "notes: update own"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "notes: delete own" ON public.notes;
CREATE POLICY "notes: delete own"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "notes: admin update any" ON public.notes;
CREATE POLICY "notes: admin update any"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "notes: admin delete any" ON public.notes;
CREATE POLICY "notes: admin delete any"
  ON public.notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 2) Audit log policy idempotency
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs: read own" ON public.audit_logs;
CREATE POLICY "audit_logs: read own"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs: admin read all" ON public.audit_logs;
CREATE POLICY "audit_logs: admin read all"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

