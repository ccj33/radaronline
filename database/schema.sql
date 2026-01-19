-- =====================================================
-- RADAR 2.0 - SQL COMPLETO PARA SUPABASE
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Colar e executar
-- =====================================================

-- =====================================================
-- PARTE 1: TABELA DE PROFILES (Usuários)
-- Esta tabela já pode existir por padrão no Supabase
-- Se já existir, os comandos com IF NOT EXISTS serão ignorados
-- =====================================================

-- Verificar se a tabela profiles existe e adicionar colunas extras se necessário
DO $$ 
BEGIN
    -- Adicionar coluna municipio se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'municipio') THEN
        ALTER TABLE public.profiles ADD COLUMN municipio TEXT;
    END IF;
    
    -- Adicionar coluna lgpd_consentimento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lgpd_consentimento') THEN
        ALTER TABLE public.profiles ADD COLUMN lgpd_consentimento BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar coluna lgpd_consentimento_data se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lgpd_consentimento_data') THEN
        ALTER TABLE public.profiles ADD COLUMN lgpd_consentimento_data TIMESTAMPTZ;
    END IF;
    
    -- Adicionar coluna avatar_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_id') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_id TEXT DEFAULT 'zg10';
    END IF;
    
    -- Adicionar coluna created_by se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_by') THEN
        ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- Habilitar RLS em profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 2: TABELA DE AÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.actions (
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

CREATE INDEX IF NOT EXISTS idx_actions_microregiao ON public.actions(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_activity ON public.actions(activity_id);
CREATE INDEX IF NOT EXISTS idx_actions_uid ON public.actions(uid);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 3: TABELA RACI (Responsáveis das Ações)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.action_raci (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('R', 'A', 'C', 'I')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_raci_action ON public.action_raci(action_id);

ALTER TABLE public.action_raci ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 4: TABELA DE COMENTÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.action_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  parent_id UUID REFERENCES public.action_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_action ON public.action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.action_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.action_comments(parent_id);

ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 5: TABELA DE EQUIPES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teams (
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

CREATE INDEX IF NOT EXISTS idx_teams_microregiao ON public.teams(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_teams_email ON public.teams(email);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 6: TABELA DE SOLICITAÇÕES DE USUÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_requests (
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

CREATE INDEX IF NOT EXISTS idx_user_requests_user ON public.user_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);

ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 7: TABELA DE LOGS DE ATIVIDADE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('auth', 'action', 'user', 'view')),
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 8: TABELAS DE ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    page_count INT DEFAULT 0,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_analytics (
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

CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON public.user_analytics(page);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON public.user_sessions(started_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 9: FUNÇÃO HELPER - VERIFICAR SE É ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- PARTE 10: TRIGGER - CRIAR PROFILE AUTOMATICAMENTE
-- Quando um usuário é criado no auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, microregiao_id, ativo, lgpd_consentimento, avatar_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'usuario'),
    NEW.raw_user_meta_data->>'microregiaoId',
    true,
    false,
    'zg10',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se existir e recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PARTE 11: POLÍTICAS RLS - PROFILES
-- =====================================================

-- Usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins podem ver todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- Usuários podem editar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem editar qualquer perfil
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Admins podem inserir perfis
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = id);

-- =====================================================
-- PARTE 12: POLÍTICAS RLS - ACTIONS
-- =====================================================

DROP POLICY IF EXISTS "Admins podem tudo em actions" ON public.actions;
CREATE POLICY "Admins podem tudo em actions" ON public.actions
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Usuários podem ver ações de sua microrregião" ON public.actions;
CREATE POLICY "Usuários podem ver ações de sua microrregião" ON public.actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Gestores podem editar ações de sua microrregião" ON public.actions;
CREATE POLICY "Gestores podem editar ações de sua microrregião" ON public.actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('gestor')
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Gestores podem inserir ações em sua microrregião" ON public.actions;
CREATE POLICY "Gestores podem inserir ações em sua microrregião" ON public.actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Gestores podem deletar ações de sua microrregião" ON public.actions;
CREATE POLICY "Gestores podem deletar ações de sua microrregião" ON public.actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('gestor')
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );

-- =====================================================
-- PARTE 13: POLÍTICAS RLS - ACTION_RACI
-- =====================================================

DROP POLICY IF EXISTS "Acesso RACI baseado na ação" ON public.action_raci;
CREATE POLICY "Acesso RACI baseado na ação" ON public.action_raci
  FOR ALL USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_raci.action_id
      AND (p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );

-- =====================================================
-- PARTE 14: POLÍTICAS RLS - ACTION_COMMENTS
-- =====================================================

DROP POLICY IF EXISTS "Ler comentários" ON public.action_comments;
CREATE POLICY "Ler comentários" ON public.action_comments
  FOR SELECT USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_comments.action_id
      AND (p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Inserir comentários" ON public.action_comments;
CREATE POLICY "Inserir comentários" ON public.action_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_comments.action_id
      AND (p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );

-- =====================================================
-- PARTE 15: POLÍTICAS RLS - TEAMS
-- =====================================================

DROP POLICY IF EXISTS "Ver equipes" ON public.teams;
CREATE POLICY "Ver equipes" ON public.teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gerenciam equipes" ON public.teams;
CREATE POLICY "Admins gerenciam equipes" ON public.teams
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Gestores podem editar equipe de sua micro" ON public.teams;
CREATE POLICY "Gestores podem editar equipe de sua micro" ON public.teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor'
      AND profiles.microregiao_id = teams.microregiao_id
    )
  );

-- =====================================================
-- PARTE 16: POLÍTICAS RLS - USER_REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Usuários veem suas solicitações" ON public.user_requests;
CREATE POLICY "Usuários veem suas solicitações" ON public.user_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar solicitações" ON public.user_requests;
CREATE POLICY "Usuários podem criar solicitações" ON public.user_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins veem todas solicitações" ON public.user_requests;
CREATE POLICY "Admins veem todas solicitações" ON public.user_requests
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins podem atualizar solicitações" ON public.user_requests;
CREATE POLICY "Admins podem atualizar solicitações" ON public.user_requests
  FOR UPDATE USING (public.is_admin());

-- =====================================================
-- PARTE 17: POLÍTICAS RLS - ACTIVITY_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.activity_logs;
CREATE POLICY "Admins podem ver todos os logs" ON public.activity_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Usuários podem inserir logs" ON public.activity_logs;
CREATE POLICY "Usuários podem inserir logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PARTE 18: POLÍTICAS RLS - ANALYTICS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
CREATE POLICY "Users can update own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own analytics" ON public.user_analytics;
CREATE POLICY "Users can insert own analytics" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all analytics" ON public.user_analytics;
CREATE POLICY "Admins can view all analytics" ON public.user_analytics
    FOR SELECT USING (public.is_admin());

-- =====================================================
-- PARTE 19: HABILITAR REALTIME (OPCIONAL)
-- =====================================================

-- Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_requests;

-- =====================================================
-- PARTE 20: CRIAR PRIMEIRO SUPERADMIN
-- =====================================================
-- IMPORTANTE: Após criar o primeiro usuário no Auth do Supabase,
-- execute este comando substituindo o ID pelo ID real do usuário:
--
-- UPDATE public.profiles 
-- SET role = 'superadmin', ativo = true, lgpd_consentimento = true
-- WHERE email = 'seu-email@exemplo.com';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
-- Execute este script completo no Supabase SQL Editor
-- Se algum comando falhar, verifique se a tabela/coluna já existe
-- =====================================================
