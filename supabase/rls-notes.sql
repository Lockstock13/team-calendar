-- ============================================================
-- Apply Row Level Security (RLS) to Notes Table
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Enable RLS on the table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Read
-- Any authenticated team member can read all notes
CREATE POLICY "notes: read all"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

-- 3. Policy: Insert
-- Any authenticated team member can create a new note
CREATE POLICY "notes: insert"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Policy: Update
-- Any authenticated team member can edit any note (Team Collaboration)
CREATE POLICY "notes: update"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (true);

-- 5. Policy: Delete
-- Any authenticated team member can delete any note
CREATE POLICY "notes: delete"
  ON public.notes FOR DELETE
  TO authenticated
  USING (true);
