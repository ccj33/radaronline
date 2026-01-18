-- =====================================
-- FIX: PROFILE RLS RECURSION (Login Timeout)
-- Data: 2026-01-18
-- =====================================
-- 
-- PROBLEMA: A query em profiles trava por 10s devido a 
-- políticas RLS que chamam is_admin_or_superadmin(), 
-- que por sua vez consulta profiles, causando recursão infinita.
--
-- SOLUÇÃO: Usar políticas que não referenciam a própria tabela
-- ou usar auth.uid() diretamente sem funções helper.
--
-- =====================================

-- =====================================================================
-- PASSO 1: DIAGNÓSTICO - Verificar políticas atuais em profiles
-- Execute isso primeiro para entender o estado atual
-- =====================================================================

SELECT 
  policyname, 
  cmd, 
  permissive,
  roles::text,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================================
-- PASSO 2: REMOVER POLÍTICAS PROBLEMÁTICAS
-- =====================================================================

-- Remover qualquer política que use is_admin_or_superadmin em profiles
-- Essas políticas causam recursão infinita!
DROP POLICY IF EXISTS "profile_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profile_delete_admin" ON public.profiles;

-- Remover políticas genéricas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- =====================================================================
-- PASSO 3: CRIAR POLÍTICAS SEGURAS PARA PROFILES
-- Regra: NUNCA usar funções que consultam profiles dentro de policies de profiles
-- =====================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuário pode ver SEU PRÓPRIO perfil (essencial para login)
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- Policy 2: Admin/Superadmin pode ver TODOS os perfis
-- IMPORTANTE: Usamos subquery direto em vez de função helper para evitar recursão
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
);

-- Policy 3: Usuário pode atualizar SEU PRÓPRIO perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Policy 4: Admin/Superadmin pode atualizar QUALQUER perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
);

-- Policy 5: Apenas superadmin pode inserir novos perfis
CREATE POLICY "profiles_insert_admin" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'superadmin'
  )
);

-- Policy 6: Apenas superadmin pode deletar perfis
CREATE POLICY "profiles_delete_admin" ON public.profiles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'superadmin'
  )
);

-- =====================================================================
-- PASSO 4: GARANTIR ÍNDICES PARA PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- =====================================================================
-- PASSO 5: NOTIFICAR POSTGREST PARA RECARREGAR SCHEMA
-- =====================================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- PASSO 6: VERIFICAÇÃO - Execute após aplicar as correções
-- =====================================================================

-- Verificar novas políticas
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles::text
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Testar acesso ao próprio perfil (deve retornar dados)
-- SELECT id, nome, email, role FROM public.profiles WHERE id = auth.uid();

-- =====================================
-- FIM DO SCRIPT
-- =====================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute o PASSO 1 para ver estado atual
-- 2. Execute PASSOS 2-5 juntos como uma transação
-- 3. Execute PASSO 6 para verificar
-- 4. Teste o login na aplicação
-- 
-- Se ainda houver problemas, verifique se a função 
-- is_admin_or_superadmin() tem SECURITY DEFINER e está
-- corretamente configurada (ver rls-audit-and-fixes.sql)
-- =====================================
