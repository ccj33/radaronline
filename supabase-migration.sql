-- =====================================
-- RADAR 2.0 - SUPABASE MIGRATION
-- Execute este script no SQL Editor do Supabase
-- =====================================

-- ==================================
-- TABELA: actions (Ações por Microrregião)
-- ==================================
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE, -- Ex: "MR009::1.1.1"
  action_id TEXT NOT NULL, -- Ex: "1.1.1"
  activity_id TEXT NOT NULL, -- Ex: "1.1"
  microregiao_id TEXT NOT NULL, -- Ex: "MR009"
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_actions_microregiao ON public.actions(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_actions_activity ON public.actions(activity_id);
CREATE INDEX IF NOT EXISTS idx_actions_uid ON public.actions(uid);

-- RLS
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Admins podem tudo" ON public.actions;
CREATE POLICY "Admins podem tudo" ON public.actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

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
      AND profiles.role IN ('admin', 'gestor')
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Gestores podem inserir ações em sua microrregião" ON public.actions;
CREATE POLICY "Gestores podem inserir ações em sua microrregião" ON public.actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestor')
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Gestores podem deletar ações de sua microrregião" ON public.actions;
CREATE POLICY "Gestores podem deletar ações de sua microrregião" ON public.actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestor')
      AND (profiles.microregiao_id = actions.microregiao_id OR profiles.microregiao_id IS NULL)
    )
  );


-- ==================================
-- TABELA: action_raci (Membros RACI por Ação)
-- ==================================
CREATE TABLE IF NOT EXISTS public.action_raci (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('R', 'A', 'C', 'I')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_raci_action ON public.action_raci(action_id);

ALTER TABLE public.action_raci ENABLE ROW LEVEL SECURITY;

-- Herda RLS da tabela actions
DROP POLICY IF EXISTS "Acesso baseado na ação" ON public.action_raci;
CREATE POLICY "Acesso baseado na ação" ON public.action_raci
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_raci.action_id
      AND (p.role = 'admin' OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );


-- ==================================
-- TABELA: action_comments (Comentários vinculados a usuários)
-- ==================================
CREATE TABLE IF NOT EXISTS public.action_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_action ON public.action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.action_comments(author_id);

ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

-- Todos podem ler comentários de ações que podem ver
DROP POLICY IF EXISTS "Ler comentários" ON public.action_comments;
CREATE POLICY "Ler comentários" ON public.action_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_comments.action_id
      AND (p.role = 'admin' OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );

-- Usuários autenticados podem inserir comentários
DROP POLICY IF EXISTS "Inserir comentários" ON public.action_comments;
CREATE POLICY "Inserir comentários" ON public.action_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = action_comments.action_id
      AND (p.role = 'admin' OR p.microregiao_id = a.microregiao_id OR p.microregiao_id IS NULL)
    )
  );


-- ==================================
-- TABELA: teams (Membros de Equipe por Microrregião)
-- ==================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microregiao_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  municipio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_microregiao ON public.teams(microregiao_id);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Todos podem ver equipes
DROP POLICY IF EXISTS "Ver equipes" ON public.teams;
CREATE POLICY "Ver equipes" ON public.teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admin pode gerenciar equipes
DROP POLICY IF EXISTS "Admin gerencia equipes" ON public.teams;
CREATE POLICY "Admin gerencia equipes" ON public.teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );


-- ==================================
-- DADOS INICIAIS (OPCIONAL)
-- Descomente se quiser migrar dados de exemplo
-- ==================================

/*
-- Inserir ações de exemplo para Poços de Caldas (MR009)
INSERT INTO public.actions (uid, action_id, activity_id, microregiao_id, title, status, start_date, planned_end_date, end_date, progress, notes)
VALUES 
  ('MR009::1.1.1', '1.1.1', '1.1', 'MR009', 'Mapear o ambiente de informação', 'Concluído', '2025-11-01', '2026-01-15', '2026-02-02', 100, 'Houve atraso na entrega dos relatórios.'),
  ('MR009::1.2.1', '1.2.1', '1.2', 'MR009', 'Criar e implementar estratégia', 'Concluído', '2026-05-25', '2026-09-04', '2026-08-20', 100, 'Equipe foi eficiente.'),
  ('MR009::1.2.2', '1.2.2', '1.2', 'MR009', 'Realizar capacitação técnica', 'Não Iniciado', '2026-01-22', '2026-09-05', NULL, 0, 'Planejamento.'),
  ('MR009::1.3.1', '1.3.1', '1.3', 'MR009', 'Definir fluxos de acompanhamento', 'Não Iniciado', '2026-05-25', '2026-08-30', NULL, 0, ''),
  ('MR009::1.3.2', '1.3.2', '1.3', 'MR009', 'Sistematizar fluxos de trabalho', 'Em Andamento', '2026-05-25', '2026-08-31', NULL, 45, '');

-- Inserir equipe de Poços de Caldas
INSERT INTO public.teams (microregiao_id, name, role, email, municipio)
VALUES
  ('MR009', 'Lhays Rezende', 'Responsável Eixo', 'lhays@saude.mg.gov.br', 'Poços de Caldas'),
  ('MR009', 'Grupo Poços', 'Comitê Regional', 'comite@pocos.mg.gov.br', 'Poços de Caldas'),
  ('MR009', 'Ciclano', 'Técnico', 'ciclano@exemplo.com', 'Botelhos'),
  ('MR009', 'Prefeitura', 'Institucional', 'contato@prefeitura.gov.br', 'Poços de Caldas'),
  ('MR009', 'APS', 'Atenção Primária', 'aps@saude.gov.br', 'Campestre'),
  ('MR009', 'Blabla', 'Apoio', 'blabla@apoio.com', 'Machado');
*/

-- ==================================
-- FIM DA MIGRAÇÃO
-- ==================================
