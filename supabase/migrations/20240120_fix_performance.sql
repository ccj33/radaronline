-- FIX DE PERFORMANCE AVANÇADO (PRIVATE SCHEMA + INITPLAN)
-- --------------------------------------------------------------------------
-- Este script:
-- 1. Cria um schema 'private' para esconder funções de segurança da API.
-- 2. Define search_path seguro para evitar hijacking.
-- 3. Usa wrappers (SELECT func()) nas policies para forçar 'initPlan'.
--    (Isso faz o banco checar a permissão 1 vez por query, não 1 vez por linha).

BEGIN;

-- 1) Criar schema privado
CREATE SCHEMA IF NOT EXISTS private;

-- 2) Criar funções de segurança (SECURITY DEFINER + search_path seguro)
CREATE OR REPLACE FUNCTION private.is_admin_or_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'superadmin'
  );
$$;

-- 3) Permissões
-- Revogamos de public (anon) para segurança
REVOKE ALL ON FUNCTION private.is_admin_or_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_superadmin() FROM PUBLIC;

-- Concedemos explicitamente para 'authenticated' para que as Policies funcionem
-- (Sem isso, a query do usuário falha ao tentar executar a policy)
GRANT EXECUTE ON FUNCTION private.is_admin_or_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated;

-- 4) Recriar Policies Otimizadas (com initPlan wrapper)

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

-- SELECT
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
    id = (select auth.uid()) 
    OR (select private.is_admin_or_superadmin())
);

-- UPDATE
CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE TO authenticated
USING (
    id = (select auth.uid()) 
    OR (select private.is_admin_or_superadmin())
)
WITH CHECK (
    id = (select auth.uid()) 
    OR (select private.is_admin_or_superadmin())
);

-- INSERT
CREATE POLICY profiles_insert_policy ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
    id = (select auth.uid())
);

-- DELETE
CREATE POLICY profiles_delete_policy ON public.profiles
FOR DELETE TO authenticated
USING (
    (select private.is_superadmin())
);

-- 5) Índices de Performance
CREATE INDEX IF NOT EXISTS idx_profiles_microregiao ON public.profiles(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_microregiao ON public.actions(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON public.actions(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMIT;
