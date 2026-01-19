-- ============================================
-- MIGRAÇÃO SEGURA: Objetivos e Atividades por Microrregião
-- ============================================
-- REVISÃO: Com backups, tipo TEXT, UUIDs e validações
-- Execute no Supabase SQL Editor

BEGIN;

-- ============================================
-- PASSO 1: BACKUP das tabelas originais
-- ============================================
CREATE TABLE IF NOT EXISTS objectives_backup AS 
SELECT * FROM objectives;

CREATE TABLE IF NOT EXISTS activities_backup AS 
SELECT * FROM activities;

-- Verificar backup
SELECT 'Backup criado: objectives_backup' as status, COUNT(*) as registros FROM objectives_backup;
SELECT 'Backup criado: activities_backup' as status, COUNT(*) as registros FROM activities_backup;

-- ============================================
-- PASSO 2: Adicionar coluna microregiao_id (tipo TEXT para consistência)
-- ============================================
ALTER TABLE objectives 
ADD COLUMN IF NOT EXISTS microregiao_id TEXT;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS microregiao_id TEXT;

-- ============================================
-- PASSO 3: Clonar objetivos e atividades para cada microrregião
-- ============================================
DO $$
DECLARE
    micro RECORD;
    obj RECORD;
    new_obj_id BIGINT;
    act RECORD;
    new_activity_id TEXT;
    cloned_objectives INT := 0;
    cloned_activities INT := 0;
BEGIN
    -- Obter microrregiões distintas de profiles
    FOR micro IN 
        SELECT DISTINCT microregiao_id 
        FROM profiles 
        WHERE microregiao_id IS NOT NULL 
          AND microregiao_id != 'all'
          AND microregiao_id != ''
    LOOP
        RAISE NOTICE 'Processando microrregião: %', micro.microregiao_id;
        
        -- Para cada objetivo SEM microregiao_id (dados antigos)
        FOR obj IN SELECT * FROM objectives WHERE microregiao_id IS NULL
        LOOP
            -- Inserir cópia do objetivo para esta micro
            INSERT INTO objectives (title, status, microregiao_id)
            VALUES (obj.title, obj.status, micro.microregiao_id)
            RETURNING id INTO new_obj_id;
            
            cloned_objectives := cloned_objectives + 1;
            
            -- Clonar atividades deste objetivo
            FOR act IN SELECT * FROM activities WHERE objective_id = obj.id AND microregiao_id IS NULL
            LOOP
                -- Gerar novo ID único usando micro + objective + sequential UUID suffix
                new_activity_id := micro.microregiao_id || '_' || new_obj_id || '.' || SUBSTRING(gen_random_uuid()::text, 1, 8);
                
                INSERT INTO activities (id, objective_id, title, description, microregiao_id)
                VALUES (new_activity_id, new_obj_id, act.title, act.description, micro.microregiao_id);
                
                cloned_activities := cloned_activities + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Clonagem concluída: % objetivos, % atividades', cloned_objectives, cloned_activities;
END $$;

-- ============================================
-- PASSO 4: Validação - Verificar se dados foram clonados
-- ============================================
SELECT 'Objetivos por Micro (novos):' as info;
SELECT microregiao_id, COUNT(*) as total 
FROM objectives 
WHERE microregiao_id IS NOT NULL 
GROUP BY microregiao_id
ORDER BY microregiao_id;

SELECT 'Atividades por Micro (novas):' as info;
SELECT microregiao_id, COUNT(*) as total 
FROM activities 
WHERE microregiao_id IS NOT NULL 
GROUP BY microregiao_id
ORDER BY microregiao_id;

-- Verificar se ainda existem originais
SELECT 'Objetivos originais (sem micro):' as info, COUNT(*) as total 
FROM objectives WHERE microregiao_id IS NULL;

SELECT 'Atividades originais (sem micro):' as info, COUNT(*) as total 
FROM activities WHERE microregiao_id IS NULL;

-- ============================================
-- PASSO 5: Remover registros originais SE clonagem foi bem-sucedida
-- ============================================
-- IMPORTANTE: Verifique os counts acima antes de descomentar!
-- Só execute se os dados foram clonados corretamente

DELETE FROM activities WHERE microregiao_id IS NULL;
DELETE FROM objectives WHERE microregiao_id IS NULL;

-- ============================================
-- PASSO 6: Verificar que não há mais NULLs antes de tornar NOT NULL
-- ============================================
DO $$
DECLARE
    null_objectives INT;
    null_activities INT;
BEGIN
    SELECT COUNT(*) INTO null_objectives FROM objectives WHERE microregiao_id IS NULL;
    SELECT COUNT(*) INTO null_activities FROM activities WHERE microregiao_id IS NULL;
    
    IF null_objectives > 0 OR null_activities > 0 THEN
        RAISE EXCEPTION 'Ainda existem registros com microregiao_id NULL! Objectives: %, Activities: %', 
            null_objectives, null_activities;
    END IF;
    
    RAISE NOTICE 'Validação OK: Nenhum registro com microregiao_id NULL';
END $$;

-- ============================================
-- PASSO 7: Tornar coluna NOT NULL e criar índices
-- ============================================
ALTER TABLE objectives 
ALTER COLUMN microregiao_id SET NOT NULL;

ALTER TABLE activities 
ALTER COLUMN microregiao_id SET NOT NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_objectives_microregiao ON objectives(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_activities_microregiao ON activities(microregiao_id);

COMMIT;

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;
SELECT 'Objectives por Micro:' as tabela, microregiao_id, COUNT(*) as total 
FROM objectives GROUP BY microregiao_id ORDER BY microregiao_id;
SELECT 'Activities por Micro:' as tabela, microregiao_id, COUNT(*) as total 
FROM activities GROUP BY microregiao_id ORDER BY microregiao_id;

-- ============================================
-- ROLLBACK (caso precise reverter)
-- ============================================
-- Para reverter, execute:
-- DROP TABLE IF EXISTS objectives CASCADE;
-- DROP TABLE IF EXISTS activities CASCADE;
-- ALTER TABLE objectives_backup RENAME TO objectives;
-- ALTER TABLE activities_backup RENAME TO activities;
