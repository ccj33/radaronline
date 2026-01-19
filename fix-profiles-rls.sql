-- =====================================================
-- RESET COMPLETO: Políticas RLS para profiles
-- Execute no SQL Editor do Supabase
-- =====================================================

-- PASSO 1: DROPAR TODAS as políticas existentes
DROP POLICY IF EXISTS "emergency_allow_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_jwt" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin" ON public.profiles;

-- PASSO 2: Garantir RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas SIMPLES e FUNCIONAIS
-- IMPORTANTE: Usar apenas auth.uid() direto, sem funções auxiliares

-- SELECT: Usuário pode ver SEU PRÓPRIO perfil
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- SELECT: Admin/SuperAdmin pode ver TODOS (usando JWT, não consulta a tabela)
CREATE POLICY "profiles_select_admin_jwt" ON public.profiles
FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'role') IN ('admin', 'superadmin'));

-- UPDATE: Usuário pode atualizar SEU PRÓPRIO perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- UPDATE: Admin pode atualizar QUALQUER perfil (usando JWT)
CREATE POLICY "profiles_update_admin_jwt" ON public.profiles
FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'role') IN ('admin', 'superadmin'))
WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'superadmin'));

-- INSERT: Admin pode criar perfis (usando JWT)
CREATE POLICY "profiles_insert_admin_jwt" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'superadmin'));

-- DELETE: Apenas SuperAdmin pode deletar (usando JWT)
CREATE POLICY "profiles_delete_superadmin_jwt" ON public.profiles
FOR DELETE TO authenticated
USING ((auth.jwt() ->> 'role') = 'superadmin');

-- PASSO 4: Notify PostgREST para recarregar
NOTIFY pgrst, 'reload schema';

-- VERIFICAÇÃO: Listar políticas criadas
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;
