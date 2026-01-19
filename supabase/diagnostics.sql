-- ===============================================================
-- DIAGNOSTIC QUERIES FOR AUTH & RLS INVESTIGATION
-- Run these in Supabase SQL Editor to debug permission issues
-- ===============================================================

-- 1. Check User Profile Existence
-- Replace <user_uuid> with the actual user ID from the logs
SELECT * FROM public.profiles WHERE id = '<user_uuid>';

-- 2. Check Auth User Meta Data (System level)
-- Requires service_role or adequate permissions
SELECT id, email, role, raw_app_meta_data, raw_user_meta_data, last_sign_in_at 
FROM auth.users 
WHERE id = '<user_uuid>';

-- 3. Check Active RLS Policies on Profiles Table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check Private Security Functions
SELECT nspname, proname, proowner::regrole::text AS owner, prosecdef 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'private';

-- 5. Check Grants on Private Functions
SELECT grantee, privilege_type, routine_schema, routine_name 
FROM information_schema.role_routine_grants 
WHERE specific_schema = 'private';

-- 6. Check Indexes (Performance)
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles';

-- 7. Test Admin Function with Specific User ID (Simulation)
-- Replace <user_uuid> with the user ID to test
-- Note: This only checks the logic, not the actual RLS context if run as postgres/service_role
SELECT * FROM public.profiles 
WHERE id = '<user_uuid>' 
AND (role = 'admin' OR role = 'superadmin');

-- 8. Explain Analyze for Slow Queries (Performance)
-- Replace <user_uuid>
EXPLAIN ANALYZE SELECT * FROM public.profiles WHERE id = '<user_uuid>';
