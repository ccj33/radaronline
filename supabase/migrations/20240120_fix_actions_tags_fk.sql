-- Add action_id column
ALTER TABLE public.action_tag_assignments ADD COLUMN IF NOT EXISTS action_id uuid;

-- Populate action_id from matches in actions
UPDATE public.action_tag_assignments ata
SET action_id = a.id
FROM public.actions a
WHERE ata.action_uid = a.uid
  AND ata.action_id IS NULL;

-- Remove duplicate assignments (same action_id + tag_id) if any, before unique/index creation?
-- Assuming action_uid + tag_id was unique, action_id + tag_id should be too.

-- Add FK
ALTER TABLE public.action_tag_assignments
  ADD CONSTRAINT action_tag_assignments_action_id_fkey
  FOREIGN KEY (action_id)
  REFERENCES public.actions(id)
  ON DELETE CASCADE;

-- Index for performance (fk index)
CREATE INDEX IF NOT EXISTS idx_action_tag_assignments_action_id ON public.action_tag_assignments(action_id);

-- Optional: If we want to ensure uniqueness on (action_id, tag_id) in future, we can add a constraint,
-- but the table might already have a PK or constraint on (action_uid, tag_id).
