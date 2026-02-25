-- ============================================================
-- Security Patch: Protect Profile Roles and Active Status
-- ============================================================

-- Create a Trigger to prevent manipulation of `role` and `is_active` fields
-- from the client-side unless the user is already an admin.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If there's an attempt to change 'role' or 'is_active'
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Check if the requesting user is an admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Not authorized to change role or is_active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove any old triggers if necessary
DROP TRIGGER IF EXISTS tr_protect_profile_columns ON public.profiles;

-- Attach Trigger to run before any UPDATE on profiles
CREATE TRIGGER tr_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_columns();
