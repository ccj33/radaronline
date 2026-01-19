-- ============================================
-- CLONAGEM SEGURA: Objetivos para TODAS as Microrregiões
-- ============================================
-- CORRIGIDO: Nome da tabela é microregioes (um 'r')

-- PASSO 0: VERIFICAÇÃO
SELECT COUNT(*) as total_micros FROM public.microregioes;
SELECT COUNT(DISTINCT microregiao_id) as micros_com_objetivos FROM public.objectives;

-- PASSO 1: GARANTIR COLUNAS E EXTENSÃO
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS migration_batch TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS migration_batch TEXT;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PASSO 2: CLONAGEM
DO $$
DECLARE
    micro RECORD;
    obj RECORD;
    act RECORD;
    new_obj_id BIGINT;
    batch_id TEXT := 'batch_' || to_char(now(), 'YYYYMMDD_HH24MISS');
    cloned_micros INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando clonagem com batch_id: %', batch_id;

    FOR micro IN SELECT id FROM public.microregioes ORDER BY id
    LOOP
        IF EXISTS (SELECT 1 FROM public.objectives WHERE microregiao_id = micro.id::text) THEN
            CONTINUE;
        END IF;

        BEGIN
            FOR obj IN SELECT * FROM public.objectives_backup ORDER BY id
            LOOP
                INSERT INTO public.objectives (title, status, microregiao_id, migration_batch)
                VALUES (obj.title, obj.status, micro.id::text, batch_id)
                RETURNING id INTO new_obj_id;
                
                FOR act IN SELECT * FROM public.activities_backup WHERE objective_id = obj.id
                LOOP
                    INSERT INTO public.activities (id, objective_id, title, description, microregiao_id, migration_batch)
                    VALUES (
                        micro.id::text || '_' || new_obj_id::text || '_' || SUBSTRING(gen_random_uuid()::text, 1, 8),
                        new_obj_id,
                        act.title,
                        act.description,
                        micro.id::text,
                        batch_id
                    );
                END LOOP;
            END LOOP;
            
            cloned_micros := cloned_micros + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro micro %: %', micro.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Concluído! % microrregiões. Batch: %', cloned_micros, batch_id;
END $$;

-- PASSO 3: VERIFICAÇÃO
SELECT microregiao_id, COUNT(*) as total FROM public.objectives GROUP BY microregiao_id ORDER BY microregiao_id;
SELECT COUNT(DISTINCT microregiao_id) as total_micros_com_dados FROM public.objectives;

-- ROLLBACK (se necessário):
-- DELETE FROM activities WHERE migration_batch = 'batch_XXXXXXXX_XXXXXX';
-- DELETE FROM objectives WHERE migration_batch = 'batch_XXXXXXXX_XXXXXX';
