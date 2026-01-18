-- =====================================================
-- TESTE DE CONECTIVIDADE SUPABASE
-- =====================================================

-- Teste 1: Verificar se conseguimos consultar a tabela profiles
SELECT
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN ativo = true THEN 1 END) as profiles_ativos
FROM public.profiles;

-- Teste 2: Verificar o perfil específico do usuário
SELECT
  id,
  nome,
  email,
  role,
  ativo,
  microregiao_id
FROM public.profiles
WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5';

-- Teste 3: Verificar se as políticas RLS estão ativas
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- Teste 4: Verificar políticas ativas
SELECT
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';