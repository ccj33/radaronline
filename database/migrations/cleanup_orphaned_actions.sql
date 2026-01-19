-- ============================================
-- LIMPEZA DE AÇÕES ÓRFÃS
-- Ações cujo activity_id não existe na tabela activities
-- ============================================

-- ============================================
-- PASSO 1: IDENTIFICAR AÇÕES ÓRFÃS (SOMENTE VISUALIZAR)
-- Execute isso primeiro para ver o que será deletado
-- ============================================

SELECT 
    a.uid,
    a.action_id,
    a.activity_id,
    a.microregiao_id,
    a.title,
    a.status,
    a.created_at
FROM actions a
LEFT JOIN activities act ON a.activity_id = act.id
WHERE act.id IS NULL
ORDER BY a.microregiao_id, a.created_at;

-- ============================================
-- PASSO 2: CONTAR QUANTAS AÇÕES ÓRFÃS EXISTEM
-- ============================================

SELECT 
    a.microregiao_id,
    COUNT(*) as total_orfas
FROM actions a
LEFT JOIN activities act ON a.activity_id = act.id
WHERE act.id IS NULL
GROUP BY a.microregiao_id
ORDER BY total_orfas DESC;

-- ============================================
-- PASSO 3: DELETAR AÇÕES ÓRFÃS
-- ⚠️ CUIDADO: Execute apenas depois de verificar os passos 1 e 2
-- ============================================

-- Primeiro, fazer backup das ações órfãs (opcional mas recomendado)
-- CREATE TABLE IF NOT EXISTS actions_orphaned_backup AS
-- SELECT * FROM actions a
-- WHERE NOT EXISTS (SELECT 1 FROM activities act WHERE act.id = a.activity_id);

-- Deletar ações órfãs
DELETE FROM actions 
WHERE activity_id NOT IN (SELECT id FROM activities);

-- Verificar que não há mais órfãs
SELECT COUNT(*) as orfas_restantes 
FROM actions a
LEFT JOIN activities act ON a.activity_id = act.id
WHERE act.id IS NULL;

-- ============================================
-- PASSO 4 (OPCIONAL): ADICIONAR CONSTRAINT PARA PREVENIR ÓRFÃS NO FUTURO
-- Isso faz com que ao deletar uma atividade, as ações sejam deletadas junto
-- ============================================

-- Verificar se já existe FK
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
    ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints AS rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'actions' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'activity_id';

-- Se não existir FK, criar com CASCADE DELETE
-- ALTER TABLE actions
-- ADD CONSTRAINT fk_actions_activity
-- FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

-- Se existir FK mas sem CASCADE, recriar:
-- ALTER TABLE actions DROP CONSTRAINT nome_da_constraint_existente;
-- ALTER TABLE actions
-- ADD CONSTRAINT fk_actions_activity
-- FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;
