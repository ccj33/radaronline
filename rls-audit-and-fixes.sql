-- =====================================
-- RADAR 2.0 - AUDITORIA E CORREÇÕES RLS
-- Data: 2026-01-18
-- =====================================
-- 
-- INSTRUÇÕES:
-- 1. Execute cada seção separadamente
-- 2. Revise os resultados antes de prosseguir
-- 3. As correções são organizadas por prioridade
--
-- =====================================

-- =====================================================================
-- SEÇÃO A: DIAGNÓSTICO (READ-ONLY)
-- Execute esta query primeiro para visualizar o estado atual
-- =====================================================================

-- A.1) Verificar definição das funções helper
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS full_definition,
  p.prosecdef AS is_security_definer,
  p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin_or_superadmin', 'is_superadmin', 'get_user_microregiao')
ORDER BY p.proname;

-- A.2) Listar TODAS as policies de storage.objects
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles::text,
  cmd,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- A.3) Verificar se há buckets configurados
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- A.4) Verificar índices existentes para performance de policies
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'actions', 'action_raci', 'action_comments', 'activities', 'objectives')
ORDER BY tablename, indexname;


-- =====================================================================
-- SEÇÃO B: CORREÇÕES PRIORITÁRIAS
-- =====================================================================

-- -------------------------------------------------------
-- B.1) NORMALIZAR auth.uid() PARA (SELECT auth.uid())
-- Melhora plano de execução e consistência
-- -------------------------------------------------------

-- Recriar função is_admin_or_superadmin com (SELECT auth.uid())
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Manter permissões restritas
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;

-- Recriar função is_superadmin com (SELECT auth.uid())
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- Recriar função get_user_microregiao com (SELECT auth.uid())
CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT microregiao_id FROM public.profiles
    WHERE id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_microregiao() TO authenticated;


-- -------------------------------------------------------
-- B.2) POLICIES DE STORAGE.OBJECTS (CRÍTICO PARA AVATARS/UPLOADS)
-- Execute apenas se usar funcionalidade de upload
-- -------------------------------------------------------

-- Primeiro, verificar se existe o bucket 'avatars'
-- Se não existir, crie manualmente no Dashboard do Supabase ou:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Habilitar RLS em storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT público em arquivos do bucket 'avatars' (público)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
);

-- Policy: Usuário autenticado pode fazer upload de avatar próprio
DROP POLICY IF EXISTS "avatars_insert_authenticated" ON storage.objects;
CREATE POLICY "avatars_insert_authenticated" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- Policy: Usuário pode atualizar/substituir seu próprio avatar
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- Policy: Usuário pode deletar seu próprio avatar
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);


-- -------------------------------------------------------
-- B.3) ÍNDICES PARA PERFORMANCE DE POLICIES
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_microregiao_id ON public.profiles(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

CREATE INDEX IF NOT EXISTS idx_actions_microregiao_id ON public.actions(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON public.actions(created_by);
CREATE INDEX IF NOT EXISTS idx_actions_activity_id ON public.actions(activity_id);

CREATE INDEX IF NOT EXISTS idx_action_raci_action_id ON public.action_raci(action_id);
CREATE INDEX IF NOT EXISTS idx_action_raci_user_id ON public.action_raci(user_id);

CREATE INDEX IF NOT EXISTS idx_action_comments_action_id ON public.action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_user_id ON public.action_comments(user_id);


-- -------------------------------------------------------
-- B.4) POLICIES DE ACTIONS MAIS RESTRITIVAS (OPCIONAL)
-- Substitui as policies genéricas por regras baseadas em microrregião
-- CUIDADO: Isso vai restringir acesso! Teste em staging primeiro.
-- -------------------------------------------------------

/*
-- Descomente para aplicar políticas mais restritivas

-- SELECT: Ver ações da mesma microrregião OU ser admin
DROP POLICY IF EXISTS "actions_select_restricted" ON public.actions;
CREATE POLICY "actions_select_restricted" ON public.actions
FOR SELECT TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

-- INSERT: Criar ações apenas na própria microrregião (gestor+) OU admin
DROP POLICY IF EXISTS "actions_insert_restricted" ON public.actions;
CREATE POLICY "actions_insert_restricted" ON public.actions
FOR INSERT TO authenticated
WITH CHECK (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

-- UPDATE: Editar ações da própria microrregião (gestor+) OU admin
DROP POLICY IF EXISTS "actions_update_restricted" ON public.actions;
CREATE POLICY "actions_update_restricted" ON public.actions
FOR UPDATE TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
)
WITH CHECK (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

-- DELETE: Apenas criador ou admin
DROP POLICY IF EXISTS "actions_delete_restricted" ON public.actions;
CREATE POLICY "actions_delete_restricted" ON public.actions
FOR DELETE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

*/


-- -------------------------------------------------------
-- B.5) VERIFICAÇÃO DE PROFILE NA CRIAÇÃO DE USUÁRIO
-- Garante que trigger cria profile automaticamente
-- -------------------------------------------------------

-- Verificar se o trigger handle_new_user existe
SELECT 
  tgname AS trigger_name,
  tgtype,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');


-- =====================================================================
-- SEÇÃO C: NOTIFICAR POSTGREST PARA RECARREGAR SCHEMA
-- Execute após aplicar as correções
-- =====================================================================

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- SEÇÃO D: TESTES DE VERIFICAÇÃO (EXECUTE COMO USUÁRIO AUTENTICADO)
-- =====================================================================

-- D.1) Testar função is_admin_or_superadmin
SELECT public.is_admin_or_superadmin() AS is_admin;

-- D.2) Testar função get_user_microregiao
SELECT public.get_user_microregiao() AS my_microregiao;

-- D.3) Verificar seu próprio profile
SELECT id, nome, email, role, microregiao_id, ativo 
FROM public.profiles 
WHERE id = auth.uid();

-- D.4) Listar policies aplicadas em actions
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'actions'
ORDER BY cmd, policyname;

-- D.5) Listar policies aplicadas em storage.objects
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;
