-- =====================================================
-- CORREÇÃO FINAL: RESOLVER TIMEOUT DE AUTENTICAÇÃO
-- =====================================================
-- Aplicar solução de emergência para resolver o timeout de 10s
-- =====================================================

-- =====================================================
-- DIAGNÓSTICO RÁPIDO
-- =====================================================

-- Verificar estado atual das políticas
SELECT
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- Verificar se usuário existe
SELECT
  id,
  nome,
  email,
  role,
  ativo
FROM public.profiles
WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5';

-- =====================================================
-- SOLUÇÃO: REMOVER POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Remover TODAS as políticas atuais que podem estar causando recursão
DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin_jwt" ON public.profiles;

-- =====================================================
-- SOLUÇÃO: CRIAR POLÍTICAS SIMPLES E SEGUAS
-- =====================================================

-- Política 1: SELECT - Usuário vê seu próprio perfil OU admin vê tudo
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
    AND p.ativo = true
  )
);

-- Política 2: UPDATE - Usuário edita seu próprio perfil OU admin edita tudo
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
    AND p.ativo = true
  )
)
WITH CHECK (
  id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
    AND p.ativo = true
  )
);

-- Política 3: INSERT - Apenas admin/superadmin pode inserir
CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
    AND p.ativo = true
  )
);

-- Política 4: DELETE - Apenas superadmin pode deletar
CREATE POLICY "profiles_delete" ON public.profiles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'superadmin'
    AND p.ativo = true
  )
);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas criadas
SELECT
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- TESTE IMEDIATO
-- =====================================================

-- Agora faça logout e login novamente no app
-- O login deve funcionar sem timeout de 10 segundos

-- Se funcionar, o problema estava nas políticas RLS complexas
-- Se não funcionar, pode ser problema no código da aplicação

-- =====================================================