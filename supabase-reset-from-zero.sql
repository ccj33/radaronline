-- =====================================================
-- RADAR 2.0 - RESET COMPLETO DO SUPABASE DO ZERO
-- =====================================================
-- ⚠️  ATENÇÃO: ESTE SCRIPT DROPA TODAS AS TABELAS E RECRIA DO ZERO
-- Execute apenas se quiser perder TODOS os dados
-- =====================================================

-- =====================================================
-- PASSO 1: DROPAR TUDO (CASCADE PARA REMOVER FKs)
-- =====================================================

-- Desabilitar RLS temporariamente para permitir drops
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_raci DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.objectives DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.microregioes DISABLE ROW LEVEL SECURITY;

-- Dropar tabelas em ordem reversa das dependências
DROP TABLE IF EXISTS public.user_analytics CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.user_requests CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.action_comments CASCADE;
DROP TABLE IF EXISTS public.action_raci CASCADE;
DROP TABLE IF EXISTS public.actions CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.objectives CASCADE;
DROP TABLE IF EXISTS public.microregioes CASCADE;

-- A tabela profiles pode ter dependências especiais, dropar por último
-- Mas manter ela pois pode estar integrada com auth.users
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Limpar políticas antigas que podem ter ficado
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

-- =====================================================
-- PASSO 2: RECRIAR TABELAS DO ZERO
-- =====================================================

-- =====================================================
-- TABELA DE MICROREGIÕES (BASE GEOGRÁFICA)
-- =====================================================

CREATE TABLE public.microregioes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  municipios TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE OBJETIVOS (OBJETIVOS ESTRATÉGICOS)
-- =====================================================

CREATE TABLE public.objectives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microregiao_id TEXT NOT NULL REFERENCES public.microregioes(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'concluido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ATIVIDADES (ATIVIDADES DOS OBJETIVOS)
-- =====================================================

CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  microregiao_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'concluido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PROFILES (EXTENSÃO DO AUTH.USERS)
-- =====================================================

-- ⚠️  ATENÇÃO: Esta tabela pode já existir integrada com auth.users
-- Se já existir, execute apenas os ALTER TABLE abaixo

DO $$
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            nome TEXT,
            email TEXT,
            role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'gestor', 'admin', 'superadmin')),
            microregiao_id TEXT,
            ativo BOOLEAN DEFAULT true,
            lgpd_consentimento BOOLEAN DEFAULT false,
            lgpd_consentimento_data TIMESTAMPTZ,
            avatar_id TEXT DEFAULT 'zg10',
            created_by UUID REFERENCES public.profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            first_access BOOLEAN DEFAULT true,
            municipio TEXT
        );
    END IF;

    -- Adicionar colunas extras se necessário
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'municipio') THEN
        ALTER TABLE public.profiles ADD COLUMN municipio TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_access') THEN
        ALTER TABLE public.profiles ADD COLUMN first_access BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_by') THEN
        ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- =====================================================
-- TABELA DE AÇÕES (TAREFAS EXECUTADAS)
-- =====================================================

CREATE TABLE public.actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  action_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  microregiao_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Não Iniciado' CHECK (status IN ('Concluído', 'Em Andamento', 'Não Iniciado', 'Atrasado')),
  start_date DATE,
  planned_end_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- =====================================================
-- TABELA RACI (RESPONSÁVEIS DAS AÇÕES)
-- =====================================================

CREATE TABLE public.action_raci (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('R', 'A', 'C', 'I')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE COMENTÁRIOS
-- =====================================================

CREATE TABLE public.action_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.action_raci(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  parent_id UUID REFERENCES public.action_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE EQUIPES
-- =====================================================

CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microregiao_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cargo TEXT NOT NULL,
  email TEXT,
  municipio TEXT,
  profile_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE SOLICITAÇÕES DE USUÁRIOS
-- =====================================================

CREATE TABLE public.user_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'profile_change' CHECK (request_type IN ('profile_change', 'mention', 'system')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE LOGS DE ATIVIDADE
-- =====================================================

CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('auth', 'action', 'user', 'view')),
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE ANALYTICS
-- =====================================================

CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    page_count INT DEFAULT 0,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.user_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click', 'scroll', 'time_spent', 'session_start', 'session_end')),
    page TEXT NOT NULL,
    element TEXT,
    scroll_depth INT CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
    duration_seconds INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PASSO 3: CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_microregiao_id ON public.profiles(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- Índices para actions
CREATE INDEX IF NOT EXISTS idx_actions_microregiao_id ON public.actions(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_created_by ON public.actions(created_by);
CREATE INDEX IF NOT EXISTS idx_actions_activity_id ON public.actions(activity_id);
CREATE INDEX IF NOT EXISTS idx_actions_uid ON public.actions(uid);

-- Índices para outras tabelas
CREATE INDEX IF NOT EXISTS idx_action_raci_action_id ON public.action_raci(action_id);
CREATE INDEX IF NOT EXISTS idx_action_raci_user_id ON public.action_raci(user_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_action_id ON public.action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_user_id ON public.action_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_microregiao_id ON public.teams(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_teams_email ON public.teams(email);
CREATE INDEX IF NOT EXISTS idx_user_requests_user_id ON public.user_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.user_analytics(user_id);

-- =====================================================
-- PASSO 4: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_raci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microregioes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 5: CRIAR FUNÇÕES HELPER (SECURITY DEFINER)
-- =====================================================

-- Função para verificar se usuário é admin/superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para verificar se usuário é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para obter microrregião do usuário
CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT microregiao_id FROM public.profiles
    WHERE id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Configurar permissões das funções
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_microregiao() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_microregiao() TO authenticated;

-- =====================================================
-- PASSO 6: CRIAR POLÍTICAS RLS (VERSÃO CORRIGIDA - SEM RECURSÃO)
-- =====================================================

-- ============= PROFILES =============
-- IMPORTANTE: Usar subqueries diretas para evitar recursão infinita

-- Policy 1: Usuário pode ver SEU PRÓPRIO perfil (essencial para login)
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- Policy 2: Admin/Superadmin pode ver TODOS os perfis
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
);

-- Policy 3: Usuário pode atualizar SEU PRÓPRIO perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Policy 4: Admin/Superadmin pode atualizar QUALQUER perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('admin', 'superadmin')
  )
);

-- Policy 5: Apenas superadmin pode inserir novos perfis
CREATE POLICY "profiles_insert_admin" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'superadmin'
  )
);

-- Policy 6: Apenas superadmin pode deletar perfis
CREATE POLICY "profiles_delete_admin" ON public.profiles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'superadmin'
  )
);

-- ============= ACTIONS =============

-- SELECT: Usuário pode ver ações da própria microrregião OU se for admin
CREATE POLICY "actions_select" ON public.actions
FOR SELECT TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

-- INSERT: Gestor+ pode criar ações na própria microrregião, admin pode em qualquer lugar
CREATE POLICY "actions_insert" ON public.actions
FOR INSERT TO authenticated
WITH CHECK (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

-- UPDATE: Criador OU admin pode editar
CREATE POLICY "actions_update" ON public.actions
FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

-- DELETE: Apenas criador ou admin
CREATE POLICY "actions_delete" ON public.actions
FOR DELETE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

-- ============= ACTION_RACI =============

-- SELECT: Mesmo que actions
CREATE POLICY "action_raci_select" ON public.action_raci
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.microregiao_id = public.get_user_microregiao() OR public.is_admin_or_superadmin())
  )
);

-- INSERT/UPDATE/DELETE: Mesmo que actions
CREATE POLICY "action_raci_insert" ON public.action_raci
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.created_by = (SELECT auth.uid()) OR public.is_admin_or_superadmin())
  )
);

CREATE POLICY "action_raci_update" ON public.action_raci
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.created_by = (SELECT auth.uid()) OR public.is_admin_or_superadmin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.created_by = (SELECT auth.uid()) OR public.is_admin_or_superadmin())
  )
);

CREATE POLICY "action_raci_delete" ON public.action_raci
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.created_by = (SELECT auth.uid()) OR public.is_admin_or_superadmin())
  )
);

-- ============= ACTION_COMMENTS =============

CREATE POLICY "action_comments_select" ON public.action_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.microregiao_id = public.get_user_microregiao() OR public.is_admin_or_superadmin())
  )
);

CREATE POLICY "action_comments_insert" ON public.action_comments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_id
    AND (a.microregiao_id = public.get_user_microregiao() OR public.is_admin_or_superadmin())
  )
  AND author_id = (SELECT auth.uid())
);

CREATE POLICY "action_comments_update" ON public.action_comments
FOR UPDATE TO authenticated
USING (author_id = (SELECT auth.uid()) OR public.is_admin_or_superadmin())
WITH CHECK (author_id = (SELECT auth.uid()) OR public.is_admin_or_superadmin());

CREATE POLICY "action_comments_delete" ON public.action_comments
FOR DELETE TO authenticated
USING (author_id = (SELECT auth.uid()) OR public.is_admin_or_superadmin());

-- ============= TEAMS =============

CREATE POLICY "teams_select" ON public.teams
FOR SELECT TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "teams_insert" ON public.teams
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "teams_update" ON public.teams
FOR UPDATE TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "teams_delete" ON public.teams
FOR DELETE TO authenticated
USING (public.is_admin_or_superadmin());

-- ============= USER_REQUESTS =============

CREATE POLICY "user_requests_select" ON public.user_requests
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "user_requests_insert" ON public.user_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_requests_update" ON public.user_requests
FOR UPDATE TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

-- ============= ACTIVITY_LOGS =============

CREATE POLICY "activity_logs_select" ON public.activity_logs
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "activity_logs_insert" ON public.activity_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============= OBJECTIVES =============

CREATE POLICY "objectives_select" ON public.objectives
FOR SELECT TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "objectives_insert" ON public.objectives
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "objectives_update" ON public.objectives
FOR UPDATE TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "objectives_delete" ON public.objectives
FOR DELETE TO authenticated
USING (public.is_superadmin());

-- ============= ACTIVITIES =============

CREATE POLICY "activities_select" ON public.activities
FOR SELECT TO authenticated
USING (
  microregiao_id = public.get_user_microregiao()
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "activities_insert" ON public.activities
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "activities_update" ON public.activities
FOR UPDATE TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "activities_delete" ON public.activities
FOR DELETE TO authenticated
USING (public.is_superadmin());

-- ============= MICROREGIOES =============

CREATE POLICY "microregioes_select" ON public.microregioes
FOR SELECT TO authenticated
USING (true); -- Todos podem ver

CREATE POLICY "microregioes_insert" ON public.microregioes
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "microregioes_update" ON public.microregioes
FOR UPDATE TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

CREATE POLICY "microregioes_delete" ON public.microregioes
FOR DELETE TO authenticated
USING (public.is_superadmin());

-- ============= USER_SESSIONS & USER_ANALYTICS =============

CREATE POLICY "user_sessions_select" ON public.user_sessions
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "user_sessions_insert" ON public.user_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_analytics_select" ON public.user_analytics
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin_or_superadmin()
);

CREATE POLICY "user_analytics_insert" ON public.user_analytics
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- PASSO 7: TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE
-- =====================================================

-- Função para criar profile automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, ativo, first_access)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    true,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASSO 8: TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas que têm updated_at
CREATE TRIGGER handle_updated_at_actions
  BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_teams
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_objectives
  BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_activities
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_microregioes
  BEFORE UPDATE ON public.microregioes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- PASSO 9: STORAGE BUCKETS (SE NECESSÁRIO)
-- =====================================================

-- Verificar se bucket 'avatars' existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para storage de avatars
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_authenticated" ON storage.objects;
CREATE POLICY "avatars_insert_authenticated" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- =====================================================
-- PASSO 10: NOTIFICAR POSTGREST PARA RECARREGAR SCHEMA
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FIM DO SCRIPT - RESET COMPLETO DO ZERO
-- =====================================================

-- ✅ PRÓXIMOS PASSOS:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Aguarde a conclusão
-- 3. Execute os scripts de dados iniciais se necessário
-- 4. Teste o login na aplicação
--
-- ⚠️  ATENÇÃO: TODOS OS DADOS SERÃO PERDIDOS!
-- =====================================================