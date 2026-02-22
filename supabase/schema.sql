-- ============================================================
-- Still Photo Team Calendar — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================


-- ─── 1. PROFILES TABLE ──────────────────────────────────────
-- Supabase auto-creates auth.users. We mirror it in public.profiles.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  color       TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ─── 2. TASKS TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  start_date       DATE NOT NULL,
  end_date         DATE,
  priority         TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status           TEXT DEFAULT 'todo'   CHECK (status   IN ('todo', 'in_progress', 'done')),
  task_type        TEXT DEFAULT 'regular' CHECK (task_type IN ('regular', 'weekend', 'libur_pengganti')),
  is_weekend_task  BOOLEAN DEFAULT false,
  is_comday        BOOLEAN DEFAULT false,
  assignee_ids     UUID[] DEFAULT '{}',
  assigned_to_name TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);


-- ─── 3. TRIGGER: auto-create profile on signup ──────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'member',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 4. SEED FIRST ADMIN ────────────────────────────────────
-- Run this AFTER insidersusan@gmail.com has registered.
-- It will set her as admin.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'insidersusan@gmail.com';


-- ─── 5. ROW LEVEL SECURITY (RLS) ────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks    ENABLE ROW LEVEL SECURITY;


-- profiles: anyone logged in can read all active profiles
CREATE POLICY "profiles: read active"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = id);

-- profiles: user can update their own row
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- profiles: admin can update any row (for kick / role change)
CREATE POLICY "profiles: admin update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- tasks: all authenticated users can read all tasks
CREATE POLICY "tasks: read all"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

-- tasks: authenticated user can insert
CREATE POLICY "tasks: insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- tasks: creator can update/delete their own task
CREATE POLICY "tasks: update own"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "tasks: delete own"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- tasks: admin can update/delete any task
CREATE POLICY "tasks: admin update any"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "tasks: admin delete any"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ─── 6. ADD COLUMNS IF MIGRATING FROM EXISTING DB ───────────
-- Only run this section if your tables already exist.

-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role      TEXT NOT NULL DEFAULT 'member';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
-- ALTER TABLE public.tasks    ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'regular';

-- After adding columns, update existing task_type values:
-- UPDATE public.tasks SET task_type = 'libur_pengganti' WHERE is_comday = true;
-- UPDATE public.tasks SET task_type = 'weekend'         WHERE is_weekend_task = true AND is_comday = false;
-- UPDATE public.tasks SET task_type = 'regular'         WHERE task_type IS NULL;

-- Set first admin (re-run if needed):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'insidersusan@gmail.com';


-- ─── 7. NOTIFICATION COLUMNS (Push / Telegram / Email) ──────
-- Run this block in Supabase SQL Editor to add notification
-- preference columns and the push subscription store.

-- Notification preferences (per-user toggles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_telegram   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_push       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_email      BOOLEAN DEFAULT false;

-- Web Push subscription object (JSONB — one per user per device/browser)
-- Contains: { endpoint, keys: { p256dh, auth } }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT NULL;

-- Index so we can quickly find users who have an active push subscription
CREATE INDEX IF NOT EXISTS profiles_push_subscription_idx
  ON public.profiles USING GIN (push_subscription)
  WHERE push_subscription IS NOT NULL;

-- telegram_chat_id column (in case it's missing from older installs)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT NULL;
