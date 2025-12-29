-- =====================================
-- RADAR 2.0 - SCRIPTS AUXILIARES
-- Executar APÓS a migração principal
-- =====================================

-- ==================================
-- PARTE A: DIAGNÓSTICO PRÉ-POPULAÇÃO
-- Execute estas queries ANTES de popular profile_id
-- ==================================

-- A1. Quantos registros em teams podem ser vinculados?
SELECT 
  COUNT(*) AS total_teams,
  COUNT(CASE WHEN profile_id IS NOT NULL THEN 1 END) AS ja_vinculados,
  COUNT(CASE WHEN profile_id IS NULL THEN 1 END) AS sem_vinculo
FROM public.teams;

-- A2. Quantos matches existem por email?
SELECT COUNT(*) AS matches_disponiveis
FROM public.teams t
JOIN public.profiles p ON LOWER(TRIM(t.email)) = LOWER(TRIM(p.email))
WHERE t.profile_id IS NULL
AND t.email IS NOT NULL;

-- A3. Ver os matches específicos (para validar)
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.email AS team_email,
  t.cargo,
  p.id AS profile_id,
  p.nome AS profile_name,
  p.role AS profile_role
FROM public.teams t
JOIN public.profiles p ON LOWER(TRIM(t.email)) = LOWER(TRIM(p.email))
WHERE t.profile_id IS NULL
AND t.email IS NOT NULL
LIMIT 20;

-- ==================================
-- PARTE B: POPULAR profile_id (COM SEGURANÇA)
-- Execute SOMENTE após validar resultados de PARTE A
-- ==================================

-- B1. Primeiro, em DRY RUN (apenas mostra o que seria atualizado)
SELECT 
  t.id,
  t.name,
  t.email,
  p.id AS new_profile_id
FROM public.teams t
JOIN public.profiles p ON LOWER(TRIM(t.email)) = LOWER(TRIM(p.email))
WHERE t.profile_id IS NULL
AND t.email IS NOT NULL;

-- B2. EXECUTAR A ATUALIZAÇÃO (descomente quando pronto)
-- BEGIN;
-- 
-- UPDATE public.teams t
-- SET profile_id = p.id
-- FROM public.profiles p
-- WHERE LOWER(TRIM(t.email)) = LOWER(TRIM(p.email))
-- AND t.profile_id IS NULL
-- AND t.email IS NOT NULL;
-- 
-- -- Verificar quantos foram atualizados (deve bater com A2)
-- -- Se ok, COMMIT. Se não, ROLLBACK.
-- -- COMMIT;
-- -- ROLLBACK;

-- ==================================
-- PARTE C: VERIFICAÇÃO PÓS-MIGRAÇÃO
-- Queries para validar que tudo funcionou
-- ==================================

-- C1. Verificar tabela microregioes criada
SELECT COUNT(*) AS total_microregioes FROM public.microregioes;
-- Esperado: 89

-- C2. Verificar parent_id em action_comments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'action_comments'
AND column_name = 'parent_id';
-- Esperado: 1 linha

-- C3. Verificar renomeação teams.role -> cargo
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'teams'
AND column_name IN ('role', 'cargo');
-- Esperado: apenas 'cargo'

-- C4. Verificar profile_id em teams
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'teams'
AND column_name = 'profile_id';
-- Esperado: 1 linha, uuid

-- C5. Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('microregioes', 'activity_logs', 'profiles', 'actions', 'teams');
-- Esperado: todas com rowsecurity = true

-- C6. Listar todas as policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==================================
-- PARTE D: TESTES FUNCIONAIS
-- Execute como usuário autenticado
-- ==================================

-- D1. Teste INSERT em activity_logs (deve funcionar)
-- Substitua 'SEU_USER_ID' pelo UUID do usuário logado
-- INSERT INTO public.activity_logs (user_id, action_type, entity_type)
-- VALUES ('SEU_USER_ID', 'test', 'auth');

-- D2. Teste UPDATE em activity_logs (DEVE FALHAR - blocked by policy)
-- UPDATE public.activity_logs SET action_type = 'modified' WHERE id = 'ALGUM_ID';
-- Esperado: ERROR - policy violation

-- D3. Teste DELETE em activity_logs (DEVE FALHAR - blocked by policy)
-- DELETE FROM public.activity_logs WHERE id = 'ALGUM_ID';
-- Esperado: ERROR - policy violation

-- D4. Teste SELECT em microregioes (deve funcionar para qualquer autenticado)
SELECT * FROM public.microregioes LIMIT 5;

-- D5. Teste INSERT em microregioes (deve falhar para não-superadmin)
-- INSERT INTO public.microregioes (id, codigo, nome, macrorregiao, macro_id, urs)
-- VALUES ('TEST', '99999', 'Teste', 'Teste', 'TEST', 'Teste');
-- Esperado: ERROR se não for superadmin

-- ==================================
-- PARTE E: DIAGNÓSTICO DE DEPENDÊNCIAS
-- Verificar se há functions/views que usam nomes antigos
-- ==================================

-- E1. Functions que referenciam teams.role
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc ILIKE '%teams.role%' 
OR prosrc ILIKE '%"teams"."role"%';
-- Esperado: nenhum resultado (ou migrar as functions encontradas)

-- E2. Views que podem ter dependências
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
AND (definition ILIKE '%teams.role%' OR definition ILIKE '%action_comments.author_id%');
-- Esperado: nenhum resultado

-- ==================================
-- FIM DOS SCRIPTS AUXILIARES
-- ==================================
