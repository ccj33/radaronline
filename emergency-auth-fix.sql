-- =====================================================
-- EMERGÊNCIA: CORREÇÃO IMEDIATA DO TIMEOUT DE AUTENTICAÇÃO
-- =====================================================
-- Se ainda está com timeout de 10s, execute estes comandos em ordem
-- =====================================================

-- =====================================================
-- PASSO 1: DIAGNÓSTICO RÁPIDO
-- =====================================================

-- Verificar se usuário existe e está ativo
SELECT
  id,
  nome,
  email,
  role,
  ativo,
  microregiao_id
FROM public.profiles
WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5';

-- Verificar se há políticas problemáticas
SELECT
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- PASSO 2: SOLUÇÃO DE EMERGÊNCIA - SIMPLIFICAR POLÍTICAS
-- =====================================================

-- Remover TODAS as políticas atuais (emergência)
DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin_jwt" ON public.profiles;

-- Criar política SIMPLES que sempre funciona (temporária)
CREATE POLICY "emergency_allow_all" ON public.profiles
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- PASSO 3: TESTAR SE FUNCIONA
-- =====================================================

-- Agora teste o login no app. Deve funcionar imediatamente.
-- Se funcionar, o problema era nas políticas RLS complexas.

-- =====================================================
-- PASSO 4: SE FUNCIONOU, VOLTAR PARA POLÍTICAS SEGUAS
-- =====================================================

-- ⚠️  Só execute isso SE o login funcionou com a política de emergência

-- Remover política de emergência
DROP POLICY IF EXISTS "emergency_allow_all" ON public.profiles;

-- Criar políticas DEFINITIVAS (sem JWT claims por enquanto)
CREATE POLICY "profiles_simple_select" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT auth.uid()) IN (
  SELECT p.id FROM public.profiles p WHERE p.role IN ('admin', 'superadmin')
));

CREATE POLICY "profiles_simple_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT auth.uid()) IN (
  SELECT p.id FROM public.profiles p WHERE p.role IN ('admin', 'superadmin')
))
WITH CHECK (id = (SELECT auth.uid()) OR (SELECT auth.uid()) IN (
  SELECT p.id FROM public.profiles p WHERE p.role IN ('admin', 'superadmin')
));

CREATE POLICY "profiles_simple_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IN (
  SELECT p.id FROM public.profiles p WHERE p.role IN ('admin', 'superadmin')
));

CREATE POLICY "profiles_simple_delete" ON public.profiles
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) IN (
  SELECT p.id FROM public.profiles p WHERE p.role = 'superadmin'
));

-- =====================================================
-- PASSO 5: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas finais
SELECT
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
--
-- ✅ Login funciona sem timeout
-- ✅ Admins podem gerenciar usuários
-- ✅ Usuários normais só acessam seu perfil
-- ✅ Sem dependência de JWT hooks complexos
--
-- =====================================================