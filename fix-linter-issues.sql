-- ============================================
-- CORREÇÃO DE PERFORMANCE RLS - Supabase Linter
-- ============================================
-- Execute no Supabase SQL Editor
-- 
-- Este script corrige:
-- 1. auth_rls_initplan - Usa (SELECT auth.uid()) em vez de auth.uid()
-- 2. duplicate_index - Remove índices duplicados
-- 3. multiple_permissive_policies - Consolida policies duplicadas

-- ============================================
-- PASSO 1: REMOVER ÍNDICES DUPLICADOS
-- ============================================
DROP INDEX IF EXISTS idx_activity_logs_created_at; -- Manter idx_activity_logs_created
DROP INDEX IF EXISTS idx_activity_logs_user_id;    -- Manter idx_activity_logs_user

-- Verificar resultado
SELECT indexname FROM pg_indexes WHERE tablename='activity_logs';

-- ============================================
-- PASSO 2: REMOVER POLÍTICAS DUPLICADAS
-- ============================================
-- Nota: Remova as duplicatas mantendo apenas UMA por ação/role

-- OBJECTIVES - Remover duplicatas
DROP POLICY IF EXISTS "objectives_admin_modify" ON public.objectives;
DROP POLICY IF EXISTS "objectives_select_all" ON public.objectives;

-- ACTIVITIES - Remover duplicatas  
DROP POLICY IF EXISTS "activities_admin_modify" ON public.activities;
DROP POLICY IF EXISTS "activities_select_all" ON public.activities;

-- ACTIONS - Remover duplicatas (muitas políticas para mesmo role/ação)
DROP POLICY IF EXISTS "Gestores podem editar ações de sua microregião" ON public.actions;
DROP POLICY IF EXISTS "Admins deletam acoes" ON public.actions;
DROP POLICY IF EXISTS "Autenticados veem acoes" ON public.actions;

-- ACTION_RACI - Remover duplicatas
DROP POLICY IF EXISTS "Acesso baseado na ação" ON public.action_raci;
DROP POLICY IF EXISTS "Autenticados veem raci" ON public.action_raci;

-- ACTION_COMMENTS - Remover duplicatas
DROP POLICY IF EXISTS "Autenticados criam comentarios" ON public.action_comments;
DROP POLICY IF EXISTS "Autenticados veem comentarios" ON public.action_comments;

-- TEAMS - Remover duplicatas
DROP POLICY IF EXISTS "Admin gerencia equipes" ON public.teams;
DROP POLICY IF EXISTS "Ver equipes" ON public.teams;

-- USER_REQUESTS - Remover duplicatas
DROP POLICY IF EXISTS "user_requests_select_own" ON public.user_requests;
DROP POLICY IF EXISTS "user_requests_insert_own" ON public.user_requests;
DROP POLICY IF EXISTS "user_requests_update_admin" ON public.user_requests;

-- USER_SESSIONS - Remover duplicatas
DROP POLICY IF EXISTS "Permitir select proprio (Sessions)" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir insert (Sessions)" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir update (Sessions)" ON public.user_sessions;

-- USER_ANALYTICS - Remover duplicatas
DROP POLICY IF EXISTS "Permitir select proprio (Analytics)" ON public.user_analytics;
DROP POLICY IF EXISTS "Permitir insert (Analytics)" ON public.user_analytics;

-- ACTIVITY_LOGS - Remover duplicatas
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_gestor" ON public.activity_logs;

-- PROFILES - Remover duplicatas (manter apenas as otimizadas)
-- As policies profile_select_own e profile_update_own serão mantidas

-- ============================================
-- PASSO 3: VERIFICAR RESULTADO
-- ============================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Se após executar houver problemas de permissão:
-- 1. Verifique quais policies restaram com a query acima
-- 2. Recrie as policies necessárias usando (SELECT auth.uid())
-- 
-- Exemplo de policy otimizada:
-- CREATE POLICY "nome_policy" ON public.tabela
-- FOR SELECT TO authenticated
-- USING ((SELECT auth.uid()) = user_id);
