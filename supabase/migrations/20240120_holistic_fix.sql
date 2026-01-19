-- Migration: Holistic Auth & RLS Fix (Safe Version)
-- Description: 
-- 1. Syncs orphaned users (Auth -> Profile)
-- 2. Replaces recursive RLS logic with safe SECURITY DEFINER functions
-- 3. Optimizes Policies and Indexes
-- Date: 2024-01-20

BEGIN;

-- ==============================================================================
-- 1) BACKFILL: sync auth.users -> public.profiles
-- ==============================================================================
INSERT INTO public.profiles (
    id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, 
    created_by, created_at, updated_at, avatar_id, municipio, first_access
)
SELECT 
    u.id::uuid,
    COALESCE(
        NULLIF((u.raw_user_meta_data->>'name')::text, ''),
        NULLIF((u.raw_user_meta_data->>'nome')::text, ''),
        NULLIF((u.raw_user_meta_data->>'full_name')::text, ''),
        NULLIF((u.raw_user_meta_data->>'given_name')::text, ''),
        split_part(u.email, '@', 1)
    ) AS nome,
    lower(u.email) AS email,
    COALESCE(NULLIF(u.raw_user_meta_data->>'role',''), 'usuario')::text AS role,
    NULLIF(u.raw_user_meta_data->>'microregiao_id','')::text AS microregiao_id,
    true AS ativo,
    false AS lgpd_consentimento,
    NULL::uuid AS created_by,
    now() AS created_at,
    now() AS updated_at,
    'zg' || floor(random() * 16 + 1)::text AS avatar_id, -- Random Avatar
    NULL::text AS municipio,
    true AS first_access
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ==============================================================================
-- 2) REPLACE/CREATE SAFE ROLE CHECK FUNCTIONS
-- Use SECURITY DEFINER to query the table directly without triggering recursion
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
$$;

-- Revoke public execution for security
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;

-- ==============================================================================
-- 3) OPTIMIZE RLS POLICIES FOR public.profiles
-- ==============================================================================

-- Drop existing policies to be safe
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

-- Create new robust policies
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR is_admin_or_superadmin()
);

CREATE POLICY profiles_insert_policy ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
    id = auth.uid()
);

CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE TO authenticated
USING (
    id = auth.uid() 
    OR is_admin_or_superadmin()
)
WITH CHECK (
    id = auth.uid() 
    OR is_admin_or_superadmin()
);

CREATE POLICY profiles_delete_policy ON public.profiles
FOR DELETE TO authenticated
USING (
    is_superadmin()
);

-- ==============================================================================
-- 4) CREATE MISSING INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_action_tag_assignments_tag_id ON public.action_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON public.actions(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_user_requests_resolved_by ON public.user_requests(resolved_by);

COMMIT;
