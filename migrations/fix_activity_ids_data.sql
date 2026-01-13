-- ============================================
-- FIX: CORREÇÃO DOS IDS DE ATIVIDADES
-- ============================================
-- Este script regenera os IDs das atividades para o formato sequencial correto (ex: "MR070_1.1")
-- substituindo os IDs corrompidos/aleatórios (ex: "MR070_4.9ca...").
--
-- O script utiliza uma tabela temporária para mapear os IDs antigos para os novos
-- e atualiza as tabelas 'activities' e 'actions' (se houver CASCADE ou atualizando manualmente).

BEGIN;

-- 1. Tabela temporária para calcular os novos IDs
CREATE TEMP TABLE activity_id_mapping AS
WITH OrderedObjectives AS (
    SELECT 
        id, 
        microregiao_id,
        ROW_NUMBER() OVER (PARTITION BY microregiao_id ORDER BY id) as obj_index
    FROM objectives
),
OrderedActivities AS (
    SELECT 
        a.id as old_id,
        a.objective_id,
        a.microregiao_id,
        o.obj_index,
        ROW_NUMBER() OVER (PARTITION BY a.objective_id ORDER BY a.title) as act_index
    FROM activities a
    JOIN OrderedObjectives o ON a.objective_id = o.id
)
SELECT 
    old_id,
    microregiao_id || '_' || obj_index || '.' || act_index as new_id
FROM OrderedActivities;

-- 2. Verificar o que será mudado (opcional, para debug)
-- SELECT * FROM activity_id_mapping LIMIT 10;

-- 3. Atualizar referências na tabela ACTIONS
-- Primeiro, desabilitar triggers temporariamente se necessário, mas aqui vamos tentar update direto.
-- Precisamos dropar a constraint se não for CASCADE, mas vamos assumir que precisamos atualizar.
-- Se houver FK, a atualização do pai pode falhar se não for cascade.
-- Vamos tentar atualizar a tabela filha primeiro, mas isso violaria a FK se o pai não existir.
-- A ordem correta:
-- Se FK for CASCADE: Atualizar PAI (activities). Filhos (actions) atualizam sozinhos.
-- Se FK RESTRICT/NO ACTION: Dropar FK, Atualizar PAI, Atualizar FILHO, Recriar FK.

-- Vamos verificar se existe FK e se é CASCADE:
-- (Não conseguimos verificar fácil em script corrido, então vamos na abordagem segura: DEFERRABLE ou DROP/ADD)

-- Abordagem Segura: Adicionar coluna nova na activities, atualizar, depois trocar PK? Não, complexo.
-- Abordagem Prática: Alterar constraints para DEFERRED se possível, ou Dropar/Recriar.

-- Vamos tentar atualizar a tabela ACTIVITIES e torcer pelo CASCADE. Se falhar, o rollback acontece.
-- Mas espere, se falhar, o script aborta.
-- Vamos remover a FK da tabela actions temporariamente para garantir.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'actions_activity_id_fkey') THEN
        ALTER TABLE actions DROP CONSTRAINT actions_activity_id_fkey;
    END IF;
END $$;

-- 4. Atualizar os IDs na tabela ACTIVITIES
UPDATE activities a
SET id = m.new_id
FROM activity_id_mapping m
WHERE a.id = m.old_id;

-- 5. Atualizar os IDs na tabela ACTIONS (agora que activity mudou, actions ficaram órfãs do ID antigo)
-- ESPERA! Se eu mudei o ID na activity, a action aponta para o ID ANTIGO que não existe mais na activity?
-- Sim, se não for cascade. Como dropei a constraint, actions agora tem o ID antigo que não bate com nada.
-- Preciso atualizar actions usando o mapping.

UPDATE actions a
SET activity_id = m.new_id
FROM activity_id_mapping m
WHERE a.activity_id = m.old_id;

-- 6. Recriar a FK na tabela ACTIONS
ALTER TABLE actions 
ADD CONSTRAINT actions_activity_id_fkey 
FOREIGN KEY (activity_id) 
REFERENCES activities(id) 
ON DELETE CASCADE;

-- 7. Confirmação
SELECT 'IDs corrigidos com sucesso!' as status;

-- Consultar alguns exemplos
SELECT id, title FROM activities LIMIT 5;

COMMIT;
