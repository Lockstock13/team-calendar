-- ============================================================
-- App Customization / White-labeling Patch
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. CREATE APP SETTINGS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name        TEXT NOT NULL DEFAULT 'Team Calendar',
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#0ea5e9', -- Default Tailwind sky-500
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Ensure there is only ever ONE row in this table.
-- We can do this by forcing a specific ID or using a dummy column.
-- Alternatively, just insert the default row if it doesn't exist:
INSERT INTO public.app_settings (id, app_name) 
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 'Stay Focused Team'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- ─── 2. ROW LEVEL SECURITY (RLS) FOR APP SETTINGS ───────────
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read the app settings (even unauthenticated, so the login page can load branding)
CREATE POLICY "app_settings: read all"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admins can update the settings
CREATE POLICY "app_settings: admin update"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only admins can insert (should only be used for the first row)
CREATE POLICY "app_settings: admin insert"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─── 3. CREATE STORAGE BUCKET FOR ASSETS (LOGOS) ────────────
-- Enable the storage extension if not already enabled (usually is on Supabase)
-- Supabase Storage operates on the `storage.buckets` and `storage.objects` tables.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'assets' bucket
-- Everyone can view (public bucket)
CREATE POLICY "assets: read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- Only admins can upload, update, or delete assets
CREATE POLICY "assets: admin upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "assets: admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assets' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "assets: admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
