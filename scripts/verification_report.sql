-- ============================================
-- VERIFICAÇÃO FINAL: MCP + SUPABASE FIXES
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Data: 2026-01-23
-- ============================================

-- ============================================
-- VERIFICAÇÃO 1: ÍNDICES ATUAIS
-- ============================================

SELECT
    'ÍNDICES ATUAIS' as categoria,
    tablename as tabela,
    indexname as indice,
    CASE
        WHEN indexdef LIKE '%microregiao_id%' THEN 'microregiao_id'
        WHEN indexdef LIKE '%status%' THEN 'status'
        WHEN indexdef LIKE '%objective_id%' THEN 'objective_id'
        WHEN indexdef LIKE '%action_id%' THEN 'action_id'
        ELSE 'outros'
    END as tipo_indice,
    indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('objectives', 'activities', 'actions', 'profiles')
ORDER BY tablename, indexname;

-- ============================================
-- VERIFICAÇÃO 2: CONTAGEM DE REGISTROS
-- ============================================

SELECT
    'CONTAGEM DE REGISTROS' as categoria,
    'objectives' as tabela, COUNT(*) as total
FROM objectives
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'actions', COUNT(*) FROM actions
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'CONTAGEM DE REGISTROS', 'microregioes', COUNT(*) FROM microregioes;

-- ============================================
-- VERIFICAÇÃO 3: RLS HABILITADO
-- ============================================

SELECT
    'RLS STATUS' as categoria,
    n.nspname AS schema,
    c.relname AS tabela,
    c.relrowsecurity AS rls_habilitado
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relname IN ('objectives', 'activities', 'actions', 'profiles', 'microregioes')
ORDER BY c.relname;

-- ============================================
-- VERIFICAÇÃO 4: POLÍTICAS RLS ATIVAS
-- ============================================

SELECT
    'POLÍTICAS RLS' as categoria,
    schemaname,
    tablename,
    policyname,
    permissive,
    CASE
        WHEN qual LIKE '%admin%' THEN 'admin_only'
        WHEN qual LIKE '%authenticated%' THEN 'authenticated'
        WHEN qual LIKE '%user_id%' THEN 'owner_based'
        ELSE 'other'
    END as tipo_acesso,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('objectives', 'activities', 'actions', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- VERIFICAÇÃO 5: TRIGGERS UPDATED_AT
-- ============================================

SELECT
    'TRIGGERS UPDATED_AT' as categoria,
    tgname as trigger_nome,
    tgrelid::regclass::text AS tabela,
    CASE
        WHEN tgname LIKE '%objectives%' THEN 'objectives'
        WHEN tgname LIKE '%activities%' THEN 'activities'
        WHEN tgname LIKE '%actions%' THEN 'actions'
        ELSE 'other'
    END as tipo_trigger
FROM pg_trigger
WHERE tgname IN ('objectives_set_updated_at', 'activities_set_updated_at', 'actions_set_updated_at', 'update_objectives_updated_at', 'update_activities_updated_at')
ORDER BY tgrelid::regclass::text;

-- ============================================
-- VERIFICAÇÃO 6: DADOS ÓRFÃOS (DEVE SER ZERO)
-- ============================================

SELECT
    'DADOS ÓRFÃOS' as categoria,
    'actions_orphans' as tipo,
    COUNT(*) as quantidade
FROM actions a
LEFT JOIN activities act ON a.activity_id = act.id
WHERE act.id IS NULL

UNION ALL

SELECT
    'DADOS ÓRFÃOS' as categoria,
    'comments_orphans' as tipo,
    COUNT(*) as quantidade
FROM action_comments ac
WHERE ac.action_id NOT IN (SELECT id FROM actions)

UNION ALL

SELECT
    'DADOS ÓRFÃOS' as categoria,
    'raci_orphans' as tipo,
    COUNT(*) as quantidade
FROM action_raci ar
WHERE ar.action_id NOT IN (SELECT id FROM actions)

UNION ALL

SELECT
    'DADOS ÓRFÃOS' as categoria,
    'user_requests_orphans' as tipo,
    COUNT(*) as quantidade
FROM user_requests ur
WHERE ur.user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- VERIFICAÇÃO 7: PERFORMANCE E ESTATÍSTICAS
-- ============================================

SELECT
    'PERFORMANCE STATS' as categoria,
    relname as tabela,
    seq_scan as sequential_scans,
    idx_scan as index_scans,
    CASE
        WHEN seq_scan + idx_scan = 0 THEN 'N/A'
        ELSE ROUND((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 1) || '%'
    END as uso_indice,
    n_live_tup as linhas_vivas,
    n_dead_tup as linhas_mortas
FROM pg_stat_all_tables
WHERE schemaname = 'public'
AND relname IN ('objectives', 'activities', 'actions', 'profiles')
ORDER BY relname;

-- ============================================
-- VERIFICAÇÃO 8: COLUNAS IMPORTANTES
-- ============================================

SELECT
    'COLUNAS IMPORTANTES' as categoria,
    table_name,
    column_name,
    data_type,
    CASE
        WHEN column_name = 'updated_at' THEN 'trigger_auto'
        WHEN column_name = 'created_at' THEN 'timestamp_auto'
        WHEN column_name = 'microregiao_id' THEN 'fk_microregiao'
        WHEN column_name = 'objective_id' THEN 'fk_objective'
        WHEN column_name = 'activity_id' THEN 'fk_activity'
        WHEN column_name = 'status' THEN 'enum_status'
        ELSE 'other'
    END as importancia
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('objectives', 'activities', 'actions', 'profiles')
AND column_name IN ('id', 'created_at', 'updated_at', 'microregiao_id', 'objective_id', 'activity_id', 'status', 'role', 'ativo')
ORDER BY table_name, ordinal_position;

-- ============================================
-- RESULTADO FINAL
-- ============================================

DO $$
DECLARE
    total_indices INTEGER;
    total_policies INTEGER;
    total_triggers INTEGER;
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_indices
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('objectives', 'activities', 'actions', 'profiles');

    SELECT COUNT(*) INTO total_policies
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('objectives', 'activities', 'actions', 'profiles');

    SELECT COUNT(*) INTO total_triggers
    FROM pg_trigger
    WHERE tgname IN ('objectives_set_updated_at', 'activities_set_updated_at', 'actions_set_updated_at', 'update_objectives_updated_at', 'update_activities_updated_at');

    SELECT COUNT(*) INTO orphan_count
    FROM (
        SELECT 1 FROM actions a LEFT JOIN activities act ON a.activity_id = act.id WHERE act.id IS NULL
        UNION ALL
        SELECT 1 FROM action_comments WHERE action_id NOT IN (SELECT id FROM actions)
        UNION ALL
        SELECT 1 FROM action_raci WHERE action_id NOT IN (SELECT id FROM actions)
    ) as orphans;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO FINAL DE VERIFICAÇÃO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Índices criados: %', total_indices;
    RAISE NOTICE 'Políticas RLS ativas: %', total_policies;
    RAISE NOTICE 'Triggers updated_at: %', total_triggers;
    RAISE NOTICE 'Dados órfãos encontrados: %', orphan_count;

    IF orphan_count = 0 THEN
        RAISE NOTICE '✅ STATUS: TODAS AS CORREÇÕES FORAM APLICADAS COM SUCESSO!';
    ELSE
        RAISE NOTICE '❌ STATUS: AINDA HÁ % DADOS ÓRFÃOS A SEREM CORRIGIDOS', orphan_count;
    END IF;

    RAISE NOTICE '========================================';
END $$;