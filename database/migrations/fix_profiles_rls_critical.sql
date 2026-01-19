-- =============================================================================
-- FIX PROFILES RLS - CORREÇÃO CRÍTICA PARA DESBLOQUEAR LOGIN
-- =============================================================================
-- PROBLEMA: A função is_admin_or_superadmin() consulta profiles, 
-- mas a policy de profiles também usa essa função = RECURSÃO INFINITA
-- 
-- SOLUÇÃO: Usar JWT claims direto (sem consulta ao banco) para verificar role
-- =============================================================================

-- STEP 1: Recriar funções usando JWT claims (evita recursão)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Usa JWT claims direto - SEM consultar banco
  RETURN (
    current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('request.jwt.claims', true)::json->>'role' = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- STEP 2: Limpar TODAS as policies atuais da tabela profiles
-- =============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- STEP 3: Criar policies simples e sem recursão
-- =============================================================================

-- SELECT: Usuário pode ver próprio perfil OU admin vê todos (via JWT)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (select auth.uid())
    OR current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'superadmin')
  );

-- INSERT: Apenas o próprio usuário pode criar seu perfil
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- UPDATE: Próprio perfil OU admin (via JWT)
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (select auth.uid())
    OR current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'superadmin')
  )
  WITH CHECK (
    id = (select auth.uid())
    OR current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'superadmin')
  );

-- DELETE: Somente superadmin (via JWT)
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'superadmin'
  );

-- =============================================================================
-- DONE!
-- =============================================================================
SELECT 'Profiles RLS corrigido - login deve funcionar agora!' as status;
