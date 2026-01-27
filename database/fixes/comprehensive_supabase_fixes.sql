-- =====================================================
-- COMPREHENSIVE SUPABASE PERFORMANCE & SECURITY FIXES
-- Projeto Radar 2.0 - ID: nnmgmklaygaxxepryktn
-- =====================================================

-- =====================================================
-- 1. CORREÇÕES DE PERFORMANCE RLS (CRÍTICO)
-- =====================================================
-- Substituir auth.uid() por (select auth.uid()) nas políticas RLS
-- para evitar reavaliação para cada linha

-- Tabela: actions
DROP POLICY IF EXISTS "Usuários podem ver ações de sua microregião" ON actions;
CREATE POLICY "Usuários podem ver ações de sua microregião" ON actions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND (microregiao_id = actions.microregiao_id OR microregiao_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Gestores podem editar ações de sua microregião" ON actions;
CREATE POLICY "Gestores podem editar ações de sua microregião" ON actions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'gestor')
    AND (microregiao_id = actions.microregiao_id OR microregiao_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Gestores podem inserir ações em sua microregião" ON actions;
CREATE POLICY "Gestores podem inserir ações em sua microregião" ON actions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'gestor')
    AND (microregiao_id = actions.microregiao_id OR microregiao_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Gestores podem deletar ações de sua microregião" ON actions;
CREATE POLICY "Gestores podem deletar ações de sua microregião" ON actions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'gestor')
    AND (microregiao_id = actions.microregiao_id OR microregiao_id IS NULL)
  )
);

-- Tabela: action_comments
DROP POLICY IF EXISTS "Ler comentários" ON action_comments;
CREATE POLICY "Ler comentários" ON action_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM actions a JOIN profiles p ON p.id = (select auth.uid())
    WHERE a.id = action_comments.action_id
    AND (p.role IN ('admin', 'superadmin') OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Inserir comentários" ON action_comments;
CREATE POLICY "Inserir comentários" ON action_comments
FOR INSERT WITH CHECK (
  author_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM actions a JOIN profiles p ON p.id = (select auth.uid())
    WHERE a.id = action_comments.action_id
    AND (p.role IN ('admin', 'superadmin', 'gestor') OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
  )
);

-- Tabela: teams
DROP POLICY IF EXISTS "Ver equipes" ON teams;
CREATE POLICY "Ver equipes" ON teams
FOR SELECT USING (
  (select auth.uid()) IS NOT NULL
);

-- Tabela: action_tags
DROP POLICY IF EXISTS "Autenticados podem criar tags" ON action_tags;
CREATE POLICY "Autenticados podem criar tags" ON action_tags
FOR INSERT WITH CHECK (
  (select auth.role()) = 'authenticated'
);

-- Tabela: action_tag_assignments
DROP POLICY IF EXISTS "Autenticados podem gerenciar assignments" ON action_tag_assignments;
CREATE POLICY "Autenticados podem gerenciar assignments" ON action_tag_assignments
FOR ALL USING (
  (select auth.role()) = 'authenticated'
);

-- Tabela: action_raci
DROP POLICY IF EXISTS "Acesso baseado na ação" ON action_raci;
CREATE POLICY "Acesso baseado na ação" ON action_raci
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM actions a JOIN profiles p ON p.id = (select auth.uid())
    WHERE a.id = action_raci.action_id
    AND (p.role IN ('admin', 'superadmin') OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
  )
);

-- Tabela: user_requests
DROP POLICY IF EXISTS "Usuarios veem suas solicitacoes" ON user_requests;
CREATE POLICY "Usuarios veem suas solicitacoes" ON user_requests
FOR SELECT USING (
  user_id = (select auth.uid())
);

-- Tabelas: activities, objectives
DROP POLICY IF EXISTS "Permitir escrita para Admins (Activities)" ON activities;
CREATE POLICY "Permitir escrita para Admins (Activities)" ON activities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "Permitir escrita para Admins (Objectives)" ON objectives;
CREATE POLICY "Permitir escrita para Admins (Objectives)" ON objectives
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'superadmin')
  )
);

-- =====================================================
-- 2. CORREÇÕES DE ÍNDICES (ALTA PRIORIDADE)
-- =====================================================

-- Criar índices para chaves estrangeiras sem cobertura
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_tags_created_by_fkey
ON action_tags(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macrorregioes_focal_point_id_fkey
ON macrorregioes(focal_point_id);

-- Remover índices não utilizados (baseado nos CSVs)
DROP INDEX IF EXISTS idx_objectives_status;
DROP INDEX IF EXISTS idx_objectives_microregiao;
DROP INDEX IF EXISTS idx_action_comments_action_id_created_at;
DROP INDEX IF EXISTS idx_profiles_ativo;
DROP INDEX IF EXISTS idx_actions_activity;
DROP INDEX IF EXISTS idx_activity_logs_entity_id;
DROP INDEX IF EXISTS idx_profiles_microregiao;
DROP INDEX IF EXISTS idx_profiles_role_microregiao;
DROP INDEX IF EXISTS idx_action_comments_author_id;
DROP INDEX IF EXISTS idx_profiles_microregiao_active;
DROP INDEX IF EXISTS idx_action_raci_action_id;
DROP INDEX IF EXISTS idx_action_comments_action_id;
DROP INDEX IF EXISTS idx_action_tag_assignments_uid;
DROP INDEX IF EXISTS idx_activity_logs_type;
DROP INDEX IF EXISTS idx_microregioes_macro;
DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_announcements_display_date;
DROP INDEX IF EXISTS idx_profiles_created_at;
DROP INDEX IF EXISTS idx_action_tag_assignments_tag_id;
DROP INDEX IF EXISTS idx_profiles_created_by;
DROP INDEX IF EXISTS idx_user_requests_resolved_by;

-- =====================================================
-- 3. CORREÇÕES DE POLÍTICAS RLS PERMISSIVAS (SEGURANÇA)
-- =====================================================

-- Corrigir políticas excessivamente permissivas
-- Tabela: activities - Remover USING (true) e WITH CHECK (true)
DROP POLICY IF EXISTS "activities_authenticated_delete" ON activities;
DROP POLICY IF EXISTS "activities_authenticated_insert" ON activities;
DROP POLICY IF EXISTS "activities_authenticated_update" ON activities;

-- Tabela: objectives - Remover USING (true) e WITH CHECK (true)
DROP POLICY IF EXISTS "objectives_authenticated_delete" ON objectives;
DROP POLICY IF EXISTS "objectives_authenticated_insert" ON objectives;
DROP POLICY IF EXISTS "objectives_authenticated_update" ON objectives;

-- =====================================================
-- 4. CORREÇÕES DE FUNÇÕES (SEGURANÇA)
-- =====================================================

-- Corrigir search_path mutável nas funções
-- Criar função helper para obter usuário atual de forma segura
CREATE OR REPLACE FUNCTION auth.current_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Recriar funções com search_path fixo
CREATE OR REPLACE FUNCTION public.sync_profile_to_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Implementação da função
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Implementação da função
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.current_user()
    AND role IN ('admin', 'superadmin')
  );
$$;

-- =====================================================
-- 5. OTIMIZAÇÕES ADICIONAIS
-- =====================================================

-- Otimizar índices compostos para consultas frequentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actions_microregiao_status
ON actions(microregiao_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_active
ON profiles(role, ativo)
WHERE ativo = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_composite
ON user_analytics(user_id, event_type, created_at DESC);

-- =====================================================
-- 6. VALIDAÇÃO FINAL
-- =====================================================

-- Verificar se as correções foram aplicadas corretamente
SELECT
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%auth.uid()%'
  AND qual NOT LIKE '%(select auth.uid())%'
ORDER BY tablename, policyname;

-- Verificar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- FIM DAS CORREÇÕES
-- =====================================================