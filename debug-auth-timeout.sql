-- =====================================================
-- DEBUG: TIMEOUT DE AUTENTICAÇÃO (10s)
-- =====================================================
-- Execute estes comandos para identificar exatamente onde está o problema
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SE O HOOK JWT ESTÁ FUNCIONANDO
-- =====================================================

-- Verificar se a função hook existe
SELECT
  proname AS function_name,
  prosecdef AS is_security_definer,
  provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'custom_access_token_hook';

-- Testar a função hook manualmente com o user_id do log
-- Substitua o UUID abaixo pelo do seu usuário: 2350e7b0-419f-4995-8b0e-36e7988d38a5
SELECT public.custom_access_token_hook('{
  "user_id": "2350e7b0-419f-4995-8b0e-36e7988d38a5",
  "claims": {
    "aud": "authenticated",
    "exp": 1737324000,
    "iat": 1737237600,
    "sub": "2350e7b0-419f-4995-8b0e-36e7988d38a5",
    "email": "nsdigi@gmail.com"
  }
}'::jsonb) AS hook_result;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS RLS ATUAIS
-- =====================================================

-- Verificar políticas da tabela profiles
SELECT
  policyname,
  cmd,
  permissive,
  roles::text,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- 3. TESTAR QUERY DIRETAMENTE (SEM RLS)
-- =====================================================

-- ⚠️  IMPORTANTE: Execute estes testes COMO USUÁRIO AUTENTICADO
-- Eles simulam exatamente o que o loadUserProfile faz

-- Teste 1: Query direta sem RLS (usando service role)
-- Deve retornar dados rapidamente
SELECT
  id,
  nome,
  email,
  role,
  microregiao_id,
  ativo,
  lgpd_consentimento,
  lgpd_consentimento_data,
  avatar_id,
  created_by,
  created_at,
  first_access
FROM public.profiles
WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5';

-- Teste 2: Verificar se usuário existe e está ativo
SELECT
  id,
  nome,
  email,
  role,
  ativo
FROM public.profiles
WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5'
AND ativo = true;

-- =====================================================
-- 4. TESTAR COM RLS ATIVADO (COMO USUÁRIO NORMAL)
-- =====================================================

-- ⚠️  Execute estes comandos LOGADO como usuário normal no app

-- Teste 1: Query exata que o loadUserProfile faz
-- SELECT id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, created_by, created_at, first_access
-- FROM public.profiles
-- WHERE id = '2350e7b0-419f-4995-8b0e-36e7988d38a5'
-- LIMIT 1;

-- Teste 2: Verificar se o usuário consegue acessar seu próprio perfil
-- SELECT id, nome, email, role, ativo FROM public.profiles WHERE id = auth.uid();

-- =====================================================
-- 5. VERIFICAR ÍNDICES DE PERFORMANCE
-- =====================================================

-- Verificar se índices existem para profiles
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY indexname;

-- =====================================================
-- 6. VERIFICAR SE HÁ DEADLOCKS OU CONTENTION
-- =====================================================

-- Verificar queries ativas que podem estar bloqueando
SELECT
  pid,
  usename,
  client_addr,
  query_start,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC;

-- =====================================================
-- 7. VERIFICAR SE O HOOK ESTÁ CONFIGURADO NO DASHBOARD
-- =====================================================

-- Se o hook NÃO estiver configurado, faça isso:
-- 1. Supabase Dashboard → Authentication → Hooks
-- 2. Encontrar "Custom Access Token Hook"
-- 3. Selecionar: public.custom_access_token_hook
-- 4. Salvar
-- 5. Fazer logout e login novamente

-- =====================================================
-- 8. DIAGNÓSTICO FINAL
-- =====================================================

-- POSSÍVEIS CAUSAS DO TIMEOUT:

-- ❌ HOOK NÃO CONFIGURADO:
-- Solução: Configurar no Dashboard + logout/login

-- ❌ POLÍTICAS RLS AINDA COM RECURSÃO:
-- Sintoma: Query funciona sem RLS, mas falha com RLS
-- Solução: Verificar se políticas ainda usam funções SECURITY DEFINER

-- ❌ JWT SEM CLAIM 'role':
-- Sintoma: Políticas negam acesso
-- Solução: Verificar conteúdo do JWT no navegador

-- ❌ ÍNDICE FALTANDO:
-- Sintoma: Query lenta mesmo sem RLS
-- Solução: Criar índices em profiles

-- ❌ USUÁRIO INATIVO OU SEM ROLE:
-- Sintoma: Query retorna NULL
-- Solução: Verificar dados do usuário

-- =====================================================
-- SCRIPTS DE EMERGÊNCIA
-- =====================================================

-- Se ainda tiver timeout, execute este comando para DESABILITAR RLS temporariamente:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Depois teste o login. Se funcionar, o problema é nas políticas RLS.

-- =====================================================