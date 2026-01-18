-- =====================================================
-- RADAR 2.0 - VERIFICAÇÃO PÓS-RESET
-- =====================================================
-- Execute após aplicar o reset e seed para verificar se tudo está OK
-- =====================================================

-- =====================================================
-- VERIFICAÇÃO 1: ESTRUTURA DAS TABELAS
-- =====================================================

-- Verificar se todas as tabelas existem
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'microregioes', 'objectives', 'activities',
  'actions', 'action_raci', 'action_comments', 'teams',
  'user_requests', 'activity_logs', 'user_sessions', 'user_analytics'
)
ORDER BY tablename;

-- =====================================================
-- VERIFICAÇÃO 2: POLÍTICAS RLS
-- =====================================================

-- Verificar políticas ativas em cada tabela
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
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- VERIFICAÇÃO 3: FUNÇÕES HELPER
-- =====================================================

-- Verificar funções criadas
SELECT
  proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  prosecdef AS is_security_definer,
  provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin_or_superadmin', 'is_superadmin', 'get_user_microregiao')
ORDER BY p.proname;

-- =====================================================
-- VERIFICAÇÃO 4: ÍNDICES
-- =====================================================

-- Verificar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'microregioes', 'objectives', 'activities',
  'actions', 'action_raci', 'action_comments', 'teams',
  'user_requests', 'activity_logs', 'user_sessions', 'user_analytics'
)
ORDER BY tablename, indexname;

-- =====================================================
-- VERIFICAÇÃO 5: TRIGGERS
-- =====================================================

-- Verificar triggers criados
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement AS action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- VERIFICAÇÃO 6: DADOS INSERIDOS
-- =====================================================

-- Contagem de registros em cada tabela
SELECT
  'profiles' AS table_name,
  COUNT(*) AS record_count
FROM public.profiles
UNION ALL
SELECT
  'microregioes' AS table_name,
  COUNT(*) AS record_count
FROM public.microregioes
UNION ALL
SELECT
  'objectives' AS table_name,
  COUNT(*) AS record_count
FROM public.objectives
UNION ALL
SELECT
  'activities' AS table_name,
  COUNT(*) AS record_count
FROM public.activities
UNION ALL
SELECT
  'actions' AS table_name,
  COUNT(*) AS record_count
FROM public.actions
UNION ALL
SELECT
  'action_raci' AS table_name,
  COUNT(*) AS record_count
FROM public.action_raci
UNION ALL
SELECT
  'action_comments' AS table_name,
  COUNT(*) AS record_count
FROM public.action_comments
UNION ALL
SELECT
  'teams' AS table_name,
  COUNT(*) AS record_count
FROM public.teams
UNION ALL
SELECT
  'user_requests' AS table_name,
  COUNT(*) AS record_count
FROM public.user_requests
UNION ALL
SELECT
  'activity_logs' AS table_name,
  COUNT(*) AS record_count
FROM public.activity_logs
UNION ALL
SELECT
  'user_sessions' AS table_name,
  COUNT(*) AS record_count
FROM public.user_sessions
UNION ALL
SELECT
  'user_analytics' AS table_name,
  COUNT(*) AS record_count
FROM public.user_analytics
ORDER BY table_name;

-- =====================================================
-- VERIFICAÇÃO 7: STORAGE BUCKETS
-- =====================================================

-- Verificar buckets de storage
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- Verificar políticas de storage
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- VERIFICAÇÃO 8: TESTE DE ACESSO (EXECUTE COMO USUÁRIO AUTENTICADO)
-- =====================================================

-- ⚠️  IMPORTANTE: Execute estas queries LOGADO como um usuário comum
-- (não como superadmin) para testar as políticas RLS

-- Teste 1: Verificar acesso ao próprio perfil
-- SELECT id, nome, email, role, microregiao_id, ativo
-- FROM public.profiles
-- WHERE id = auth.uid();

-- Teste 2: Verificar função helper
-- SELECT public.is_admin_or_superadmin() AS is_admin;

-- Teste 3: Verificar microrregião do usuário
-- SELECT public.get_user_microregiao() AS my_microregiao;

-- Teste 4: Verificar objetivos acessíveis
-- SELECT o.id, o.title, o.microregiao_id
-- FROM public.objectives o
-- WHERE o.microregiao_id = public.get_user_microregiao()
--    OR public.is_admin_or_superadmin();

-- Teste 5: Verificar actions acessíveis
-- SELECT a.id, a.title, a.microregiao_id, a.status
-- FROM public.actions a
-- WHERE a.microregiao_id = public.get_user_microregiao()
--    OR public.is_admin_or_superadmin()
-- LIMIT 5;

-- =====================================================
-- VERIFICAÇÃO 9: DIAGNÓSTICO DE PROBLEMAS
-- =====================================================

-- Verificar se há políticas duplicadas ou conflitantes
SELECT
  schemaname,
  tablename,
  policyname,
  COUNT(*) AS duplicate_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, policyname
HAVING COUNT(*) > 1
ORDER BY tablename, policyname;

-- Verificar tabelas sem RLS habilitado
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'microregioes', 'objectives', 'activities',
  'actions', 'action_raci', 'action_comments', 'teams',
  'user_requests', 'activity_logs', 'user_sessions', 'user_analytics'
)
AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = pg_tables.schemaname
  AND tablename = pg_tables.tablename
);

-- =====================================================
-- RESULTADO ESPERADO APÓS RESET:
-- =====================================================
--
-- ✅ Todas as tabelas existem
-- ✅ RLS habilitado em todas as tabelas
-- ✅ Políticas RLS criadas (sem recursão infinita)
-- ✅ Funções helper criadas
-- ✅ Índices criados para performance
-- ✅ Triggers criados para updated_at
-- ✅ Dados iniciais inseridos
-- ✅ Storage buckets configurados
-- ✅ Acesso funcionando corretamente
--
-- Se algum item estiver vermelho (❌), há problema.
--
-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================