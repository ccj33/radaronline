-- ============================================
-- OTIMIZAÇÃO DE PERFORMANCE: Script Final
-- ============================================
-- Execute no Supabase SQL Editor
-- Data: 2026-01-13
-- ============================================
-- INSTRUÇÕES:
-- 1. Execute todo este script no SQL Editor (exceto REINDEX)
-- 2. Após conclusão, execute REINDEX separadamente (um por vez)
-- ============================================

-- ============================================
-- PARTE 1: LIMPEZA PÓS-MIGRAÇÃO
-- ============================================

-- 1.1 Remover colunas migration_batch (se ainda existem)
ALTER TABLE public.objectives DROP COLUMN IF EXISTS migration_batch;
ALTER TABLE public.activities DROP COLUMN IF EXISTS migration_batch;

-- 1.2 Limpar tabelas de backup (descomente se não precisar mais)
-- DROP TABLE IF EXISTS public.objectives_backup;
-- DROP TABLE IF EXISTS public.activities_backup;

-- ============================================
-- PARTE 2: ATUALIZAR ESTATÍSTICAS
-- ============================================
-- ANALYZE atualiza estatísticas do query planner (funciona em transação)

ANALYZE public.objectives;
ANALYZE public.activities;
ANALYZE public.actions;
ANALYZE public.profiles;
ANALYZE public.teams;
ANALYZE public.microregioes;

-- ============================================
-- PARTE 3: CRIAR ÍNDICES (com verificação condicional)
-- ============================================

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_objectives_microregiao ON public.objectives(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_activities_microregiao ON public.activities(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_activities_objective_id ON public.activities(objective_id);

-- Índices para status em objectives
CREATE INDEX IF NOT EXISTS idx_objectives_status ON public.objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_micro_status ON public.objectives(microregiao_id, status);

-- Índices condicionais para activities.status (só cria se coluna existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activities_micro_status ON public.activities(microregiao_id, status);';
    RAISE NOTICE 'Índices activities.status criados com sucesso';
  ELSE
    RAISE NOTICE 'Coluna activities.status não existe - índices ignorados';
  END IF;
END$$;

-- ============================================
-- PARTE 4: OTIMIZAR TRIGGER updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 5: VERIFICAÇÃO DE SAÚDE
-- ============================================

-- 5.1 Listar índices existentes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('objectives', 'activities', 'actions', 'profiles')
ORDER BY tablename, indexname;

-- 5.2 Uso de índices vs sequential scans
SELECT 
    relname as tabela,
    seq_scan,
    idx_scan,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 'N/A'
        ELSE ROUND((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 1) || '%'
    END as uso_indice,
    n_live_tup as linhas
FROM pg_stat_all_tables 
WHERE schemaname = 'public' 
AND relname IN ('objectives', 'activities', 'actions', 'profiles', 'teams')
ORDER BY relname;

-- 5.3 Dead tuples (precisam VACUUM)
SELECT 
    relname as tabela,
    last_analyze,
    n_dead_tup as dead_tuples
FROM pg_stat_all_tables 
WHERE schemaname = 'public'
AND relname IN ('objectives', 'activities', 'actions')
ORDER BY n_dead_tup DESC;

-- ============================================
-- RESULTADO
-- ============================================
SELECT '✅ OTIMIZAÇÃO CONCLUÍDA!' as status;

-- ============================================
-- PARTE 6: REINDEX (EXECUTE SEPARADAMENTE!)
-- ============================================
-- IMPORTANTE: Copie e execute UM POR VEZ no SQL Editor:
--
-- REINDEX TABLE public.objectives;
-- REINDEX TABLE public.activities;
-- REINDEX TABLE public.actions;

-- ============================================
-- ROLLBACK (caso precise reverter índices)
-- ============================================
-- DROP INDEX IF EXISTS idx_objectives_microregiao;
-- DROP INDEX IF EXISTS idx_activities_microregiao;
-- DROP INDEX IF EXISTS idx_activities_objective_id;
-- DROP INDEX IF EXISTS idx_objectives_status;
-- DROP INDEX IF EXISTS idx_objectives_micro_status;
-- DROP INDEX IF EXISTS idx_activities_status;
-- DROP INDEX IF EXISTS idx_activities_micro_status;
