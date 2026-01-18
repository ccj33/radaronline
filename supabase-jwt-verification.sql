-- =====================================================
-- RADAR 2.0 - VERIFICAÇÃO DO JWT HOOK
-- =====================================================
-- Execute após configurar o Custom Access Token Hook
-- =====================================================

-- =====================================================
-- VERIFICAÇÃO 1: Função existe e tem permissões corretas
-- =====================================================

SELECT
  proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  prosecdef AS is_security_definer,
  provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'custom_access_token_hook';

-- Verificar permissões
SELECT
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'custom_access_token_hook'
AND routine_schema = 'public';

-- =====================================================
-- VERIFICAÇÃO 2: Políticas RLS usando JWT claims
-- =====================================================

-- Verificar se as políticas existem e estão usando auth.jwt()
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND (qual LIKE '%auth.jwt()%'
     OR with_check LIKE '%auth.jwt()%')
ORDER BY policyname;

-- =====================================================
-- VERIFICAÇÃO 3: Testar acesso com diferentes roles
-- =====================================================

-- ⚠️  IMPORTANTE: Execute estes testes LOGADO como usuário

-- Teste 1: Ver seu próprio perfil (deve funcionar sempre)
-- SELECT id, nome, email, role, ativo FROM public.profiles WHERE id = auth.uid();

-- Teste 2: Ver todos os perfis (deve funcionar apenas para admin/superadmin)
-- SELECT id, nome, email, role, ativo FROM public.profiles LIMIT 5;

-- Teste 3: Tentar editar perfil de outro usuário (deve funcionar apenas para admin/superadmin)
-- UPDATE public.profiles SET updated_at = NOW() WHERE id != auth.uid() RETURNING id;

-- Teste 4: Verificar conteúdo do JWT (no navegador console)
-- const session = await supabase.auth.getSession();
-- const token = session.data.session.access_token;
-- console.log('JWT Claims:', JSON.parse(atob(token.split('.')[1])));

-- =====================================================
-- VERIFICAÇÃO 4: Decodificar JWT atual (manual)
-- =====================================================

-- Função auxiliar para decodificar JWT
CREATE OR REPLACE FUNCTION public.decode_jwt(token text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  header jsonb;
  payload jsonb;
BEGIN
  -- JWT format: header.payload.signature
  -- Split by '.' and decode base64url the payload (second part)
  SELECT jsonb_object(
    ARRAY['header', 'payload', 'signature'],
    ARRAY[
      convert_from(decode(split_part(token, '.', 1) || '=', 'base64'), 'UTF8')::jsonb,
      convert_from(decode(split_part(token, '.', 2) || '=', 'base64'), 'UTF8')::jsonb,
      split_part(token, '.', 3)
    ]
  ) INTO header;

  RETURN header->'payload';
END;
$$;

-- ⚠️  Para usar: Substitua 'SEU_JWT_TOKEN' pelo token real
-- SELECT public.decode_jwt('SEU_JWT_TOKEN');

-- =====================================================
-- VERIFICAÇÃO 5: Problemas comuns e soluções
-- =====================================================

-- 5.1) Verificar se usuários têm role definido
SELECT
  id,
  nome,
  email,
  role,
  ativo
FROM public.profiles
WHERE role IS NULL OR role = ''
ORDER BY created_at DESC
LIMIT 10;

-- 5.2) Verificar se usuários inativos têm role (não deveriam acessar)
SELECT
  id,
  nome,
  email,
  role,
  ativo
FROM public.profiles
WHERE ativo = false
ORDER BY updated_at DESC
LIMIT 5;

-- 5.3) Contar usuários por role
SELECT
  role,
  COUNT(*) as quantidade,
  COUNT(CASE WHEN ativo THEN 1 END) as ativos
FROM public.profiles
GROUP BY role
ORDER BY role;

-- =====================================================
-- DIAGNÓSTICO FINAL
-- =====================================================

-- ✅ Se tudo estiver funcionando:
-- - JWT contém claim 'role' com valor correto
-- - Políticas RLS funcionam baseado no role do JWT
-- - Admins podem ver/editar todos os perfis
-- - Usuários comuns só veem o próprio perfil
-- - Login não dá mais timeout de 10s
--
-- ❌ Se não estiver funcionando:
-- - JWT não contém claim 'role'
-- - Políticas RLS negam acesso incorretamente
-- - Login ainda dá timeout
--
-- SOLUÇÕES:
-- 1. Verificar se hook está configurado no Dashboard
-- 2. Fazer logout e login novamente para novo JWT
-- 3. Verificar se função tem permissões corretas
-- 4. Verificar se usuários têm role definido
--
-- =====================================================