-- =====================================================
-- RADAR 2.0 - JWT CUSTOM CLAIMS HOOK
-- =====================================================
-- Adiciona o role do usuário ao JWT token
-- Necessário para as políticas RLS baseadas em auth.jwt() ->> 'role'
-- =====================================================

-- =====================================================
-- FUNÇÃO: Custom Access Token Hook
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  claims jsonb := event->'claims';
  user_role text;
BEGIN
  -- Buscar role do usuário na tabela profiles
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid
  AND ativo = true;

  -- Se encontrou role, adicionar ao JWT claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  RETURN event;
END;
$$;

-- =====================================================
-- PERMISSÕES: Permitir que o Supabase Auth execute a função
-- =====================================================

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- =====================================================
-- VERIFICAÇÃO: Testar a função
-- =====================================================

-- Teste 1: Verificar se a função existe
SELECT
  proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  prosecdef AS is_security_definer,
  provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'custom_access_token_hook';

-- =====================================================
-- INSTRUÇÕES PARA CONFIGURAR NO SUPABASE
-- =====================================================
--
-- 1. ACESSE: Supabase Dashboard → Authentication → Hooks
-- 2. PROCURE: "Custom Access Token" (pode estar em Beta)
-- 3. SELECIONE: A função "custom_access_token_hook"
-- 4. SALVE: A configuração
--
-- APÓS CONFIGURAR:
-- - Todos os novos JWT terão o claim 'role' com o valor do usuário
-- - Políticas RLS usando auth.jwt() ->> 'role' funcionarão
-- - Usuários precisarão fazer logout/login para receber novo JWT
--
-- =====================================================

-- =====================================================
-- TESTE MANUAL (OPCIONAL)
-- =====================================================

-- Simular um evento JWT (substitua USER_ID por um ID real)
-- SELECT public.custom_access_token_hook('{
--   "user_id": "2350e7b0-419f-4995-8b0e-36e7988d38a5",
--   "claims": {
--     "aud": "authenticated",
--     "exp": 1638360000,
--     "iat": 1638273600,
--     "sub": "2350e7b0-419f-4995-8b0e-36e7988d38a5",
--     "email": "user@email.com"
--   }
-- }'::jsonb);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================