-- =====================================
-- RADAR 2.0 - MIGRAÇÃO DE SEGURANÇA COMPLETA
-- Execute este script no SQL Editor do Supabase
-- Data: 2025-12-26
-- =====================================
-- 
-- ⚠️ INSTRUÇÕES IMPORTANTES:
-- 1. Execute PRIMEIRO as queries de inspeção (Parte A)
-- 2. Revise os resultados
-- 3. Execute a migração (Parte B) em ambiente de staging
-- 4. Teste a aplicação
-- 5. Execute em produção
--
-- =====================================

-- =====================================
-- PARTE A: QUERIES DE INSPEÇÃO (READ-ONLY)
-- Execute estas queries para verificar estado atual
-- =====================================

-- A.1) Listar todas as políticas RLS por schema/tabela
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  cmd, 
  roles::text,
  SUBSTRING(qual::text, 1, 100) as qual_preview
FROM pg_policies
WHERE schemaname IN ('public', 'auth', 'storage', 'vault')
ORDER BY schemaname, tablename, policyname;

-- A.2) Verificar se RLS está habilitado nas tabelas críticas
SELECT 
  n.nspname AS schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth', 'storage', 'vault')
  AND c.relkind = 'r'
  AND c.relname IN (
    'actions', 'profiles', 'activity_logs', 'teams', 
    'action_comments', 'action_raci', 'user_requests', 'microregioes',
    'secrets', 'oauth_clients', 'users', 'sessions',
    'buckets', 'objects'
  )
ORDER BY n.nspname, c.relname;

-- A.3) Listar funções SECURITY DEFINER (potencial vetor de privilégio)
SELECT 
  n.nspname AS schema, 
  p.proname AS function_name, 
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS is_security_definer,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- A.4) Verificar extensões instaladas
SELECT 
  extname AS extension,
  extversion AS version,
  CASE 
    WHEN extname IN ('http', 'pg_net', 'dblink') THEN '⚠️ ATENÇÃO: permite I/O externo'
    WHEN extname IN ('pgcrypto', 'pgsodium') THEN '✅ Criptografia'
    WHEN extname = 'pgaudit' THEN '✅ Auditoria'
    ELSE ''
  END AS notes
FROM pg_extension
WHERE extname NOT LIKE 'pg_%' OR extname IN ('pgcrypto', 'pg_net', 'pgaudit', 'pg_cron')
ORDER BY extname;

-- A.5) Verificar se vault.secrets existe e tem dados
-- (Se der erro, a tabela não existe ou você não tem acesso)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'vault' 
  AND table_name = 'secrets'
ORDER BY ordinal_position;

-- A.6) Contar registros nas tabelas principais
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'actions', COUNT(*) FROM public.actions
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM public.activity_logs
UNION ALL
SELECT 'teams', COUNT(*) FROM public.teams
UNION ALL
SELECT 'user_requests', COUNT(*) FROM public.user_requests
UNION ALL
SELECT 'microregioes', COUNT(*) FROM public.microregioes;


-- =====================================
-- PARTE B: MIGRAÇÃO DE SEGURANÇA
-- ⚠️ EXECUTE APENAS APÓS REVISAR PARTE A
-- =====================================

-- B.1) GARANTIR RLS EM TODAS AS TABELAS PÚBLICAS
-- (Muitas já devem estar habilitadas, este comando é idempotente)

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_raci ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.microregioes ENABLE ROW LEVEL SECURITY;


-- B.2) FUNÇÃO HELPER: is_admin_or_superadmin()
-- Usada em várias policies para verificar permissão

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Restringir EXECUTE apenas para authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;


-- B.3) FUNÇÃO HELPER: is_superadmin()

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;


-- B.4) FUNÇÃO HELPER: get_user_microregiao()

CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT microregiao_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_microregiao() TO authenticated;


-- B.5) POLÍTICAS PARA ACTIVITY_LOGS (IMUTABILIDADE)
-- Garantir que logs não possam ser alterados ou excluídos

DROP POLICY IF EXISTS "Logs são imutáveis - no update" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no update" ON public.activity_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Logs são imutáveis - no delete" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no delete" ON public.activity_logs
  FOR DELETE USING (false);

-- Apenas o próprio usuário pode inserir logs com seu user_id
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_own" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os logs
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin());

-- Gestores podem ver logs de sua microrregião
DROP POLICY IF EXISTS "activity_logs_select_gestor" ON public.activity_logs;
CREATE POLICY "activity_logs_select_gestor" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role = 'gestor'
      AND activity_logs.user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p.microregiao_id = viewer.microregiao_id
      )
    )
  );


-- B.6) POLÍTICAS PARA USER_REQUESTS

DROP POLICY IF EXISTS "user_requests_select_own" ON public.user_requests;
CREATE POLICY "user_requests_select_own" ON public.user_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "user_requests_insert_own" ON public.user_requests;
CREATE POLICY "user_requests_insert_own" ON public.user_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_requests_update_admin" ON public.user_requests;
CREATE POLICY "user_requests_update_admin" ON public.user_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "user_requests_delete_admin" ON public.user_requests;
CREATE POLICY "user_requests_delete_admin" ON public.user_requests
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());


-- B.7) ÍNDICES PARA PERFORMANCE DE POLICIES

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_microregiao ON public.profiles(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_requests_user ON public.user_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);


-- B.8) COMENTÁRIOS DE DOCUMENTAÇÃO

COMMENT ON FUNCTION public.is_admin_or_superadmin() IS 
  'Verifica se o usuário atual é admin ou superadmin. SECURITY DEFINER para evitar bypass.';

COMMENT ON FUNCTION public.is_superadmin() IS 
  'Verifica se o usuário atual é superadmin. SECURITY DEFINER para evitar bypass.';

COMMENT ON FUNCTION public.get_user_microregiao() IS 
  'Retorna a microrregião do usuário atual. SECURITY DEFINER para evitar bypass.';

COMMENT ON TABLE public.activity_logs IS 
  'Logs de atividade do sistema - IMUTÁVEIS (não permite UPDATE/DELETE)';


-- B.9) NOTIFICAR POSTGREST PARA RECARREGAR SCHEMA

NOTIFY pgrst, 'reload schema';


-- =====================================
-- PARTE C: VAULT.SECRETS (OPCIONAL)
-- ⚠️ Execute apenas se usar supabase_vault
-- =====================================

-- C.1) Habilitar RLS em vault.secrets (se existir)
-- NOTA: Descomente apenas se a tabela existir

/*
ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode acessar
DROP POLICY IF EXISTS "vault_secrets_service_role_only" ON vault.secrets;
CREATE POLICY "vault_secrets_service_role_only" ON vault.secrets
  FOR ALL USING (
    auth.role() = 'service_role'
  );

REVOKE ALL ON vault.secrets FROM PUBLIC;
REVOKE ALL ON vault.secrets FROM anon;
REVOKE ALL ON vault.secrets FROM authenticated;
*/


-- =====================================
-- PARTE D: VERIFICAÇÃO PÓS-MIGRAÇÃO
-- Execute após a migração para confirmar
-- =====================================

-- D.1) Verificar que as funções helper existem
SELECT 
  proname AS function_name,
  prosecdef AS is_security_definer
FROM pg_proc 
WHERE proname IN ('is_admin_or_superadmin', 'is_superadmin', 'get_user_microregiao')
  AND pronamespace = 'public'::regnamespace;

-- D.2) Verificar policies de activity_logs
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'activity_logs'
ORDER BY policyname;

-- D.3) Verificar políticas de imutabilidade funcionam
-- (Este insert deve funcionar se você estiver autenticado)
-- INSERT INTO public.activity_logs (user_id, action_type, entity_type)
-- VALUES (auth.uid(), 'test', 'auth');

-- (Este update deve FALHAR)
-- UPDATE public.activity_logs SET action_type = 'hacked' WHERE id = '...';


-- =====================================
-- FIM DA MIGRAÇÃO
-- =====================================
-- 
-- CHECKLIST PÓS-MIGRAÇÃO:
-- [ ] Executar queries de inspeção (Parte A)
-- [ ] Verificar se funções helper existem
-- [ ] Testar login/logout na aplicação
-- [ ] Testar criação de usuário (admin)
-- [ ] Testar visualização de logs (admin)
-- [ ] Verificar que logs não podem ser editados
-- [ ] Testar Edge Functions no Dashboard
--
-- =====================================
