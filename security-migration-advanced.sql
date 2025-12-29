-- =====================================
-- RADAR 2.0 - MIGRAÇÃO DE SEGURANÇA AVANÇADA
-- Execute APÓS a security-migration.sql
-- Data: 2025-12-26
-- =====================================
--
-- Este script contém:
-- • PARTE E: Proteção vault.secrets
-- • PARTE F: Proteção oauth_clients
-- • PARTE G: REVOKE de funções SECURITY DEFINER
-- • PARTE H: Verificações finais
-- • PARTE I: Checklist de testes com curl
--
-- ⚠️ EXECUTE EM STAGING PRIMEIRO!
-- =====================================


-- =====================================
-- PARTE E: PROTEÇÃO vault.secrets
-- =====================================
-- vault.secrets contém segredos criptografados
-- APENAS service_role deve ter acesso

-- E.1) Verificar se vault.secrets existe
SELECT 
  schemaname, 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'vault' AND tablename = 'secrets';

-- E.2) Habilitar RLS (execute se a query acima retornar resultado)
ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.secrets FORCE ROW LEVEL SECURITY;

-- E.3) Revogar todos os privilégios públicos
REVOKE ALL ON vault.secrets FROM PUBLIC;
REVOKE ALL ON vault.secrets FROM anon;
REVOKE ALL ON vault.secrets FROM authenticated;

-- E.4) Criar policy que permite acesso APENAS via service_role
-- NOTA: Em Supabase, auth.role() retorna 'service_role' quando usa service_role key
DROP POLICY IF EXISTS "vault_secrets_service_role_only" ON vault.secrets;
CREATE POLICY "vault_secrets_service_role_only" ON vault.secrets
  FOR ALL 
  USING (
    -- Permite apenas quando chamado via service_role
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    OR
    -- Ou quando é o postgres/owner direto
    current_user IN ('postgres', 'supabase_admin')
  );

-- E.5) Comentário de documentação
COMMENT ON TABLE vault.secrets IS 
  'Segredos criptografados - RLS restrito a service_role apenas';


-- =====================================
-- PARTE F: PROTEÇÃO auth.oauth_clients
-- =====================================
-- Protege client_secret_hash de clientes OAuth

-- F.1) Verificar se oauth_clients existe e tem RLS
SELECT 
  schemaname, 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'auth' AND tablename = 'oauth_clients';

-- F.2) Habilitar RLS (execute se a tabela existir)
-- ⚠️ CUIDADO: Se você não usa OAuth, pode pular esta parte
ALTER TABLE auth.oauth_clients ENABLE ROW LEVEL SECURITY;

-- F.3) Revogar privilégios públicos
REVOKE ALL ON auth.oauth_clients FROM PUBLIC;
REVOKE ALL ON auth.oauth_clients FROM anon;
REVOKE ALL ON auth.oauth_clients FROM authenticated;

-- F.4) Criar policy - apenas superadmin pode gerenciar OAuth clients
DROP POLICY IF EXISTS "oauth_clients_superadmin_only" ON auth.oauth_clients;
CREATE POLICY "oauth_clients_superadmin_only" ON auth.oauth_clients
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'superadmin'
    )
    OR
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- F.5) Mesma coisa para oauth_authorizations e oauth_consents (se existirem)
DO $$
BEGIN
  -- oauth_authorizations
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'oauth_authorizations') THEN
    ALTER TABLE auth.oauth_authorizations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON auth.oauth_authorizations FROM PUBLIC, anon, authenticated;
  END IF;
  
  -- oauth_consents
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'oauth_consents') THEN
    ALTER TABLE auth.oauth_consents ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON auth.oauth_consents FROM PUBLIC, anon, authenticated;
  END IF;
END $$;


-- =====================================
-- PARTE G: REVOKE EXECUTE DE FUNÇÕES SECURITY DEFINER
-- =====================================
-- Funções SECURITY DEFINER executam com privilégios do owner
-- Revogar de PUBLIC/anon para evitar escalonamento

-- G.1) Listar funções SECURITY DEFINER antes de revogar
SELECT 
  n.nspname AS schema, 
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS owner,
  CASE 
    WHEN p.proname LIKE '%secret%' THEN '⚠️ SENSÍVEL'
    WHEN p.proname LIKE 'handle_%' THEN '⚠️ TRIGGER'
    ELSE ''
  END AS risk_level
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY n.nspname, p.proname;

-- G.2) Revogar EXECUTE de funções do vault (se existirem)
DO $$
BEGIN
  -- vault.create_secret
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_secret' AND pronamespace = 'vault'::regnamespace) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION vault.create_secret FROM PUBLIC, anon, authenticated';
  END IF;
  
  -- vault.update_secret
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_secret' AND pronamespace = 'vault'::regnamespace) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION vault.update_secret FROM PUBLIC, anon, authenticated';
  END IF;
  
  -- vault.read_secret
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'read_secret' AND pronamespace = 'vault'::regnamespace) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION vault.read_secret FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- G.3) Revogar de funções públicas sensíveis (triggers e helpers)
-- handle_new_user - trigger de criação de usuário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon';
    -- Manter para authenticated pois é trigger
  END IF;
END $$;

-- G.4) Garantir que nossas funções helper estão seguras
-- (Já fizemos na security-migration.sql, mas garantir)
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_microregiao() TO authenticated;


-- =====================================
-- PARTE H: VERIFICAÇÕES FINAIS
-- =====================================

-- H.1) Confirmar que vault.secrets tem RLS habilitado
SELECT 
  'vault.secrets' AS table_name,
  CASE WHEN relrowsecurity THEN '✅ RLS HABILITADO' ELSE '❌ RLS DESABILITADO' END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'vault' AND c.relname = 'secrets';

-- H.2) Listar todas as policies de vault.secrets
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'vault' AND tablename = 'secrets';

-- H.3) Verificar que funções helper não são acessíveis por anon
SELECT 
  p.proname AS function_name,
  CASE 
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN '❌ anon TEM EXECUTE'
    ELSE '✅ anon NÃO TEM EXECUTE'
  END AS anon_status,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ authenticated TEM EXECUTE'
    ELSE '⚠️ authenticated NÃO TEM EXECUTE'
  END AS authenticated_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('is_admin_or_superadmin', 'is_superadmin', 'get_user_microregiao', 'handle_new_user');

-- H.4) Resumo de contagem de policies por tabela
SELECT 
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname IN ('public', 'vault', 'auth')
GROUP BY tablename
ORDER BY policy_count DESC;


-- =====================================
-- PARTE I: NOTIFICAR POSTGREST
-- =====================================

NOTIFY pgrst, 'reload schema';


-- =====================================
-- FIM DA MIGRAÇÃO AVANÇADA
-- =====================================
