-- Migration: Fix Orphaned Users
-- Description: Inserts a profile for any user in auth.users that is missing from public.profiles
-- Date: 2024-01-20

INSERT INTO public.profiles (id, email, nome, role, ativo, first_access, avatar_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', split_part(au.email, '@', 1)), -- Use metadata name or part of email
  COALESCE(au.raw_user_meta_data->>'role', 'usuario'), -- Default role
  TRUE, -- Active
  TRUE, -- First Access
  'zg' || floor(random() * 16 + 1)::text -- Random avatar
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;

-- Output result
DO $$
DECLARE
  inserted_count INT;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Synced % orphaned users.', inserted_count;
END $$;
