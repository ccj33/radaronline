-- ============================================
-- RADAR 2.0 - CORREÇÃO COMPLETA DE SUPABASE
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Colar e executar
-- Data: 2026-01-19
-- ============================================

-- ============================================
-- PARTE 1: UNIFICAR FUNÇÕES HELPER
-- ============================================

-- 1.1 Função principal: is_admin_or_superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.2 is_admin() agora é alias da principal (evita duplicação)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin_or_superadmin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.3 is_superadmin mantém lógica própria
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.4 get_user_microregiao
CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT microregiao_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.5 Restringir EXECUTE apenas para authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_microregiao() TO authenticated;

-- ============================================
-- PARTE 2: LIMPAR POLICIES DUPLICADAS
-- ============================================

-- 2.1 Activity Logs - remover duplicatas
DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Usuários podem inserir logs" ON public.activity_logs;

-- 2.2 Recriar policies padronizadas
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_own" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2.3 Garantir imutabilidade dos logs
DROP POLICY IF EXISTS "Logs são imutáveis - no update" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no update" ON public.activity_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Logs são imutáveis - no delete" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no delete" ON public.activity_logs
  FOR DELETE USING (false);

-- ============================================
-- PARTE 3: CORRIGIR POLICIES DE PROFILES
-- ============================================

-- 3.1 Limpar policies antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- 3.2 Recriar com nomes padronizados e lógica correta
-- SELECT: Usuário vê próprio perfil OU admin vê todos
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin());

-- UPDATE: Usuário edita próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: Admin edita qualquer perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- INSERT: Trigger de auth cria perfil OU admin cria
CREATE POLICY "profiles_insert_trigger" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin_or_superadmin());

-- DELETE: Apenas superadmin pode deletar
CREATE POLICY "profiles_delete_superadmin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- ============================================
-- PARTE 4: OTIMIZAR ÍNDICES
-- ============================================

-- Índice para role (usado em funções helper)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);

-- ============================================
-- PARTE 5: ATUALIZAR ESTATÍSTICAS
-- ============================================

ANALYZE public.profiles;
ANALYZE public.activity_logs;
ANALYZE public.actions;

-- ============================================
-- PARTE 6: NOTIFICAR POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar funções criadas
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_admin_or_superadmin', 'is_superadmin', 'get_user_microregiao')
  AND pronamespace = 'public'::regnamespace;

-- Verificar policies de profiles
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verificar policies de activity_logs
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'activity_logs'
ORDER BY policyname;

SELECT '✅ CORREÇÃO COMPLETA APLICADA!' as status;
