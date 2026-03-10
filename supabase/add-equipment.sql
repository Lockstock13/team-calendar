-- ============================================================
-- SQL Script for Adding Equipment Feature
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. EQUIPMENT TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.equipment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  serial_number TEXT,
  category      TEXT DEFAULT 'Kamera', -- Kamera, Lensa, Drone, Lighting, dll
  status      TEXT DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Dipinjam', 'Maintenance', 'Rusak')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Equipment: Any authenticated user can view equipment
CREATE POLICY "equipment_read_all"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

-- Equipment: Any authenticated user can manage (insert/update/delete)
-- (We allow all members to add/edit equipment for simplicity, 
--  or you can restrict to admin if needed later)
CREATE POLICY "equipment_all_actions"
  ON public.equipment FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─── 2. TASK_EQUIPMENT (Relasi) ──────────────────────────────
-- Table ini menyimpan relasi (Task <-> User <-> Equipment)
CREATE TABLE IF NOT EXISTS public.task_equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  equipment_id  UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for task_equipment
ALTER TABLE public.task_equipment ENABLE ROW LEVEL SECURITY;

-- Task_Equipment: Authenticated users can read all
CREATE POLICY "task_equipment_read_all"
  ON public.task_equipment FOR SELECT
  TO authenticated
  USING (true);

-- Task_Equipment: Authenticated users can manage it
CREATE POLICY "task_equipment_all_actions"
  ON public.task_equipment FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS task_equipment_task_id_idx ON public.task_equipment(task_id);
CREATE INDEX IF NOT EXISTS task_equipment_user_id_idx ON public.task_equipment(user_id);
