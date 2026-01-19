-- ========================================
-- RADAR 2.0 - SETUP FINAL DO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- Data: 11/01/2026
-- ========================================

-- ========================================
-- 1. VERIFICAR/CRIAR TABELAS OBJECTIVES E ACTIVITIES
-- ========================================

-- Tabela de Objetivos Estratégicos
CREATE TABLE IF NOT EXISTS objectives (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'delayed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Atividades
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,  -- Formato: "1.1", "2.3", etc.
    objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activities_objective_id ON activities(objective_id);

-- ========================================
-- 2. INSERIR DADOS INICIAIS (SE NÃO EXISTIREM)
-- ========================================

-- Inserir objetivos iniciais
INSERT INTO objectives (id, title, status) VALUES
    (1, '1. Infoestrutura e Governança', 'on-track'),
    (2, '2. Desenvolvimento de Negócios', 'on-track'),
    (3, '3. Experiência do Cliente', 'delayed')
ON CONFLICT (id) DO NOTHING;

-- Resetar sequence para próximo ID
SELECT setval('objectives_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM objectives), false);

-- Inserir atividades iniciais
INSERT INTO activities (id, objective_id, title, description) VALUES
    ('1.1', 1, 'Diagnóstico e Mapeamento', 'Implantar a estratégia de gestão de conhecimento.'),
    ('1.2', 1, 'Gestão do Conhecimento e Qualificação', 'Fortalecer a governança, a gestão do conhecimento.'),
    ('1.3', 1, 'Governança e Fluxos de Trabalho', 'Garantir a sustentabilidade e o aprimoramento da Infoestrutura.'),
    ('2.1', 2, 'Atração de Investimentos', 'Fomento ao comércio local.'),
    ('3.1', 3, 'Digitalização de Serviços', 'Portal do Cidadão.')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) para recriar
DROP POLICY IF EXISTS "objectives_select_all" ON objectives;
DROP POLICY IF EXISTS "objectives_admin_modify" ON objectives;
DROP POLICY IF EXISTS "activities_select_all" ON activities;
DROP POLICY IF EXISTS "activities_admin_modify" ON activities;

-- Objectives: todos podem ler
CREATE POLICY "objectives_select_all" ON objectives
    FOR SELECT 
    USING (true);

-- Objectives: apenas admin pode inserir/atualizar/deletar
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

-- Activities: todos podem ler
CREATE POLICY "activities_select_all" ON activities
    FOR SELECT 
    USING (true);

-- Activities: apenas admin pode inserir/atualizar/deletar
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

-- ========================================
-- 4. TRIGGERS PARA UPDATED_AT
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para objectives
DROP TRIGGER IF EXISTS update_objectives_updated_at ON objectives;
CREATE TRIGGER update_objectives_updated_at
    BEFORE UPDATE ON objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. VERIFICAR COLUNA municipio EM profiles
-- ========================================

-- Garantir que a coluna municipio existe na tabela profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'municipio'
    ) THEN
        ALTER TABLE profiles ADD COLUMN municipio TEXT;
        RAISE NOTICE 'Coluna municipio adicionada à tabela profiles';
    ELSE
        RAISE NOTICE 'Coluna municipio já existe na tabela profiles';
    END IF;
END $$;

-- ========================================
-- 6. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se tudo está OK
DO $$
DECLARE
    obj_count INTEGER;
    act_count INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO obj_count FROM objectives;
    SELECT COUNT(*) INTO act_count FROM activities;
    
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'objectives';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Objectives cadastrados: %', obj_count;
    RAISE NOTICE 'Activities cadastradas: %', act_count;
    RAISE NOTICE 'RLS habilitado em objectives: %', rls_enabled;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Setup concluído com sucesso!';
    RAISE NOTICE '========================================';
END $$;

-- Listar dados para conferência
SELECT 'OBJECTIVES' as tabela, id::text, title, status FROM objectives
UNION ALL
SELECT 'ACTIVITIES', id, title, description FROM activities
ORDER BY tabela, id;
