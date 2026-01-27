-- ============================================
-- CORREÇÕES COMPLETAS: MCP + SUPABASE FIXES
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Data: 2026-01-23
-- ============================================

-- ============================================
-- PARTE 1: CORREÇÕES DE PERFORMANCE E ÍNDICES
-- ============================================

-- 1.1 Corrigir índices duplicados/órfãos
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    -- Remover índices duplicados ou problemáticos
    FOR idx_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND (
            indexname LIKE '%microregiao%' OR
            indexname LIKE '%status%' OR
            indexname LIKE '%objective_id%'
        )
        AND indexdef LIKE '%microregiao_id%' -- Procurar por microregiao_id em índices
    LOOP
        -- Verificar se o índice tem microregiao_id mas a tabela não tem esta coluna
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = idx_record.tablename
            AND column_name = 'microregiao_id'
        ) THEN
            EXECUTE 'DROP INDEX IF EXISTS ' || idx_record.indexname;
            RAISE NOTICE 'Removido índice órfão: % da tabela %', idx_record.indexname, idx_record.tablename;
        END IF;
    END LOOP;
END $$;

-- 1.2 Criar índices corretos apenas onde as colunas existem
DO $$
BEGIN
    -- Índice para objectives (só se microregiao_id existir)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'microregiao_id') THEN
        CREATE INDEX IF NOT EXISTS idx_objectives_microregiao ON public.objectives(microregiao_id);
    END IF;

    -- Índice para activities (só se microregiao_id existir)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'microregiao_id') THEN
        CREATE INDEX IF NOT EXISTS idx_activities_microregiao ON public.activities(microregiao_id);
    END IF;

    -- Índices para status (sempre criar se colunas existirem)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_objectives_status ON public.objectives(status);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
    END IF;

    -- Índice para foreign key (sempre necessário)
    CREATE INDEX IF NOT EXISTS idx_activities_objective_id ON public.activities(objective_id);

    RAISE NOTICE 'Índices criados/verificados com sucesso';
END $$;

-- ============================================
-- PARTE 2: LIMPEZA DE DADOS ÓRFÃOS
-- ============================================

-- 2.1 Limpar ações órfãs (activity_id que não existe em activities)
DELETE FROM actions
WHERE activity_id IS NOT NULL
AND activity_id NOT IN (SELECT id FROM activities);

-- 2.2 Limpar comentários órfãs
DELETE FROM action_comments
WHERE action_id NOT IN (SELECT id FROM actions);

-- 2.3 Limpar RACI órfão
DELETE FROM action_raci
WHERE action_id NOT IN (SELECT id FROM actions);

-- 2.4 Limpar user_requests órfãs
DELETE FROM user_requests
WHERE user_id NOT IN (SELECT id FROM profiles);

-- ============================================
-- PARTE 3: CORREÇÕES DE CONSTRAINTS E RELACIONAMENTOS
-- ============================================

-- 3.1 Garantir que FK actions.activity_id tenha CASCADE DELETE correto
DO $$
BEGIN
    -- Verificar se já existe FK com CASCADE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'actions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule = 'CASCADE'
        AND EXISTS (
            SELECT 1 FROM information_schema.key_column_usage kcu
            WHERE kcu.constraint_name = tc.constraint_name
            AND kcu.column_name = 'activity_id'
        )
    ) THEN
        -- Remover FK existente se houver
        ALTER TABLE actions DROP CONSTRAINT IF EXISTS fk_actions_activity;

        -- Adicionar FK com CASCADE DELETE
        ALTER TABLE actions
        ADD CONSTRAINT fk_actions_activity
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

        RAISE NOTICE 'FK actions.activity_id corrigida com CASCADE DELETE';
    END IF;
END $$;

-- 3.2 Adicionar colunas faltantes em objectives se necessário
DO $$
BEGIN
    -- Adicionar microregiao_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'microregiao_id') THEN
        ALTER TABLE objectives ADD COLUMN microregiao_id TEXT;
        RAISE NOTICE 'Coluna microregiao_id adicionada à objectives';
    END IF;

    -- Adicionar status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'status') THEN
        ALTER TABLE objectives ADD COLUMN status TEXT DEFAULT 'on-track' CHECK (status IN ('on-track', 'delayed'));
        RAISE NOTICE 'Coluna status adicionada à objectives';
    END IF;
END $$;

-- 3.3 Adicionar colunas faltantes em activities se necessário
DO $$
BEGIN
    -- Adicionar microregiao_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'microregiao_id') THEN
        ALTER TABLE activities ADD COLUMN microregiao_id TEXT;
        RAISE NOTICE 'Coluna microregiao_id adicionada à activities';
    END IF;

    -- Adicionar status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'status') THEN
        ALTER TABLE activities ADD COLUMN status TEXT DEFAULT 'on-track' CHECK (status IN ('on-track', 'delayed'));
        RAISE NOTICE 'Coluna status adicionada à activities';
    END IF;
END $$;

-- ============================================
-- PARTE 4: CORREÇÕES DE RLS (ROW LEVEL SECURITY)
-- ============================================

-- 4.1 Garantir RLS habilitado nas tabelas críticas
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE microregioes ENABLE ROW LEVEL SECURITY;

-- 4.2 Recriar políticas RLS consistentes
-- Remover políticas existentes
DROP POLICY IF EXISTS "objectives_select_all" ON objectives;
DROP POLICY IF EXISTS "objectives_admin_modify" ON objectives;
DROP POLICY IF EXISTS "activities_select_all" ON activities;
DROP POLICY IF EXISTS "activities_admin_modify" ON activities;

-- Políticas para objectives
CREATE POLICY "objectives_select_all" ON objectives
    FOR SELECT USING (true);

CREATE POLICY "objectives_admin_modify" ON objectives
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Políticas para activities
CREATE POLICY "activities_select_all" ON activities
    FOR SELECT USING (true);

CREATE POLICY "activities_admin_modify" ON activities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- ============================================
-- PARTE 5: ATUALIZAR TRIGGERS UPDATED_AT
-- ============================================

-- 5.1 Função unificada para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Aplicar triggers atualizados
DROP TRIGGER IF EXISTS update_objectives_updated_at ON objectives;
CREATE TRIGGER update_objectives_updated_at
    BEFORE UPDATE ON objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 6: VERIFICAÇÕES FINAIS
-- ============================================

-- 6.1 Estatísticas de saúde do banco
ANALYZE objectives, activities, actions, profiles;

-- 6.2 Verificação de integridade
DO $$
DECLARE
    obj_count INTEGER;
    act_count INTEGER;
    action_count INTEGER;
    orphan_actions INTEGER;
BEGIN
    SELECT COUNT(*) INTO obj_count FROM objectives;
    SELECT COUNT(*) INTO act_count FROM activities;
    SELECT COUNT(*) INTO action_count FROM actions;

    SELECT COUNT(*) INTO orphan_actions
    FROM actions a
    LEFT JOIN activities act ON a.activity_id = act.id
    WHERE act.id IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO FINAL DE INTEGRIDADE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Objectives: %', obj_count;
    RAISE NOTICE 'Activities: %', act_count;
    RAISE NOTICE 'Actions: %', action_count;
    RAISE NOTICE 'Actions órfãs: %', orphan_actions;

    IF orphan_actions = 0 THEN
        RAISE NOTICE '✅ Nenhuma ação órfã encontrada';
    ELSE
        RAISE NOTICE '❌ Ainda há % ações órfãs!', orphan_actions;
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- 6.3 Listar índices criados
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('objectives', 'activities', 'actions', 'profiles')
ORDER BY tablename, indexname;

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT '✅ CORREÇÕES MCP + SUPABASE CONCLUÍDAS!' as status;