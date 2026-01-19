-- =============================================================================
-- FIX RLS PERFORMANCE ISSUES
-- Corrige todos os warnings do Supabase Linter:
-- - auth_rls_initplan: substitui auth.uid() por (select auth.uid())
-- - multiple_permissive_policies: consolida policies duplicadas
-- - duplicate_index: remove índices redundantes
-- =============================================================================

-- PARTE 1: Corrigir funções helper com search_path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin_or_superadmin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT microregiao_id FROM public.profiles
    WHERE id = (select auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- PARTE 2: Remover índices duplicados (se existirem)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_comments_action;
DROP INDEX IF EXISTS public.idx_action_raci_action;
DROP INDEX IF EXISTS public.idx_activity_logs_created;
DROP INDEX IF EXISTS public.idx_activity_logs_user;
DROP INDEX IF EXISTS public.idx_profiles_microregiao;

-- PARTE 3: PROFILES - Consolidar policies
-- =============================================================================

-- Remover policies duplicadas de profiles
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_superadmin" ON public.profiles;

-- Criar policies consolidadas
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (select auth.uid()) 
    OR public.is_admin_or_superadmin()
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (select auth.uid()) 
    OR public.is_admin_or_superadmin()
  )
  WITH CHECK (
    id = (select auth.uid()) 
    OR public.is_admin_or_superadmin()
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- PARTE 4: ACTIONS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Admins e Superadmins podem tudo" ON public.actions;
DROP POLICY IF EXISTS "Usuários podem ver ações de sua microregião" ON public.actions;
DROP POLICY IF EXISTS "Gestores podem editar ações de sua microregião" ON public.actions;
DROP POLICY IF EXISTS "Gestores podem editar ações de sua microrregião" ON public.actions;
DROP POLICY IF EXISTS "Gestores podem inserir ações em sua microregião" ON public.actions;
DROP POLICY IF EXISTS "Gestores podem deletar ações de sua microregião" ON public.actions;
DROP POLICY IF EXISTS "Autenticados veem acoes" ON public.actions;
DROP POLICY IF EXISTS "Admins deletam acoes" ON public.actions;
DROP POLICY IF EXISTS "Permitir delete (Actions)" ON public.actions;
DROP POLICY IF EXISTS "actions_insert_secure" ON public.actions;
DROP POLICY IF EXISTS "actions_update_secure" ON public.actions;

-- Policies consolidadas para actions
CREATE POLICY "actions_select" ON public.actions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "actions_insert" ON public.actions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role = 'gestor'
        AND microregiao_id = actions.microregiao_id
      )
    )
  );

CREATE POLICY "actions_update" ON public.actions
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role = 'gestor'
        AND microregiao_id = actions.microregiao_id
      )
    )
  );

CREATE POLICY "actions_delete" ON public.actions
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 5: ACTION_COMMENTS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Ler comentários" ON public.action_comments;
DROP POLICY IF EXISTS "Inserir comentários" ON public.action_comments;
DROP POLICY IF EXISTS "Autenticados veem comentarios" ON public.action_comments;
DROP POLICY IF EXISTS "Autenticados criam comentarios" ON public.action_comments;
DROP POLICY IF EXISTS "action_comments_insert_secure" ON public.action_comments;
DROP POLICY IF EXISTS "action_comments_update_own" ON public.action_comments;
DROP POLICY IF EXISTS "action_comments_delete_own_or_admin" ON public.action_comments;

CREATE POLICY "action_comments_select" ON public.action_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "action_comments_insert" ON public.action_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "action_comments_update" ON public.action_comments
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "action_comments_delete" ON public.action_comments
  FOR DELETE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_admin_or_superadmin()
  );

-- PARTE 6: ACTION_RACI - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Acesso baseado na ação" ON public.action_raci;
DROP POLICY IF EXISTS "Admins gerenciam raci" ON public.action_raci;
DROP POLICY IF EXISTS "Autenticados veem raci" ON public.action_raci;
DROP POLICY IF EXISTS "action_raci_insert_secure" ON public.action_raci;
DROP POLICY IF EXISTS "action_raci_update_secure" ON public.action_raci;
DROP POLICY IF EXISTS "action_raci_delete_admin" ON public.action_raci;

CREATE POLICY "action_raci_select" ON public.action_raci
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "action_raci_insert" ON public.action_raci
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "action_raci_update" ON public.action_raci
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "action_raci_delete" ON public.action_raci
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 7: TEAMS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Ver equipes" ON public.teams;
DROP POLICY IF EXISTS "Admin gerencia equipes" ON public.teams;
DROP POLICY IF EXISTS "Usuarios veem equipe da sua micro" ON public.teams;
DROP POLICY IF EXISTS "Admins e gestores adicionam membros" ON public.teams;
DROP POLICY IF EXISTS "Admins e gestores atualizam membros" ON public.teams;
DROP POLICY IF EXISTS "Admins e gestores removem membros" ON public.teams;
DROP POLICY IF EXISTS "Permitir leitura (Teams)" ON public.teams;
DROP POLICY IF EXISTS "Permitir insert (Teams)" ON public.teams;
DROP POLICY IF EXISTS "Permitir update (Teams)" ON public.teams;
DROP POLICY IF EXISTS "Permitir delete (Teams)" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin());

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 8: USER_REQUESTS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Usuarios veem suas solicitacoes" ON public.user_requests;
DROP POLICY IF EXISTS "Usuarios criam suas solicitacoes" ON public.user_requests;
DROP POLICY IF EXISTS "Admins veem todas solicitacoes" ON public.user_requests;
DROP POLICY IF EXISTS "Admins resolvem solicitacoes" ON public.user_requests;
DROP POLICY IF EXISTS "user_requests_select_own" ON public.user_requests;
DROP POLICY IF EXISTS "user_requests_insert_own" ON public.user_requests;
DROP POLICY IF EXISTS "user_requests_update_admin" ON public.user_requests;

CREATE POLICY "user_requests_select" ON public.user_requests
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_admin_or_superadmin()
  );

CREATE POLICY "user_requests_insert" ON public.user_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_requests_update" ON public.user_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 9: USER_SESSIONS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Permitir select proprio (Sessions)" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir insert (Sessions)" ON public.user_sessions;
DROP POLICY IF EXISTS "Permitir update (Sessions)" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

CREATE POLICY "user_sessions_select" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_admin_or_superadmin()
  );

CREATE POLICY "user_sessions_insert" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_sessions_update" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- PARTE 10: USER_ANALYTICS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Permitir select proprio (Analytics)" ON public.user_analytics;
DROP POLICY IF EXISTS "Permitir insert (Analytics)" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.user_analytics;

CREATE POLICY "user_analytics_select" ON public.user_analytics
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_admin_or_superadmin()
  );

CREATE POLICY "user_analytics_insert" ON public.user_analytics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- PARTE 11: ACTION_TAGS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Autenticados podem criar tags" ON public.action_tags;
DROP POLICY IF EXISTS "Autenticados podem excluir tags" ON public.action_tags;

CREATE POLICY "action_tags_select" ON public.action_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "action_tags_insert" ON public.action_tags
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "action_tags_delete" ON public.action_tags
  FOR DELETE TO authenticated
  USING (true);

-- PARTE 12: ACTION_TAG_ASSIGNMENTS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Autenticados podem gerenciar assignments" ON public.action_tag_assignments;
DROP POLICY IF EXISTS "Todos podem ler assignments" ON public.action_tag_assignments;

CREATE POLICY "action_tag_assignments_select" ON public.action_tag_assignments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "action_tag_assignments_insert" ON public.action_tag_assignments
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "action_tag_assignments_delete" ON public.action_tag_assignments
  FOR DELETE TO authenticated
  USING (true);

-- PARTE 13: OBJECTIVES - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Permitir escrita para Admins (Objectives)" ON public.objectives;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados (Objectives)" ON public.objectives;
DROP POLICY IF EXISTS "objectives_admin_modify" ON public.objectives;
DROP POLICY IF EXISTS "objectives_select_all" ON public.objectives;

CREATE POLICY "objectives_select" ON public.objectives
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "objectives_insert" ON public.objectives
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "objectives_update" ON public.objectives
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin());

CREATE POLICY "objectives_delete" ON public.objectives
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 14: ACTIVITIES - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Permitir escrita para Admins (Activities)" ON public.activities;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados (Activities)" ON public.activities;
DROP POLICY IF EXISTS "activities_admin_modify" ON public.activities;
DROP POLICY IF EXISTS "activities_select_all" ON public.activities;

CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "activities_update" ON public.activities
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin());

CREATE POLICY "activities_delete" ON public.activities
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin());

-- PARTE 15: ACTIVITY_LOGS - Consolidar policies
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Gestores podem ver logs de sua microrregião" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_gestor" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
SELECT 'Script de otimização RLS executado com sucesso!' as status;
