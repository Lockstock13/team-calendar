-- ============================================================
-- Security Fix V2: Role Escalation Protection
-- Run this in your Supabase SQL Editor to prevent non-admins
-- from promoting themselves to admin.
-- ============================================================

-- 1. Create a trigger function to protect sensitive columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- CHECK: Only admins can change 'role' or 'is_active'
  IF (NEW.role <> OLD.role OR NEW.is_active <> OLD.is_active) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      -- If NOT an admin, force the old values
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger
DROP TRIGGER IF EXISTS on_profile_update_protect_sensitive ON public.profiles;
CREATE TRIGGER on_profile_update_protect_sensitive
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3. Ensure RLS is tight (already exists but just in case)
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 4. Add Recurrence columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_id UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS tasks_recurrence_id_idx ON public.tasks (recurrence_id);
