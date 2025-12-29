-- =====================================
-- RADAR 2.0 - ACTIVITY LOGS TABLE
-- Execute este script no SQL Editor do Supabase
-- =====================================

-- ==================================
-- TABELA: activity_logs (Log de Atividades do Sistema)
-- ==================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('auth', 'action', 'user', 'view')),
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ==================================
-- POLÍTICAS RLS
-- ==================================

-- Admins podem ver todos os logs
DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.activity_logs;
CREATE POLICY "Admins podem ver todos os logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Gestores podem ver logs de sua microrregião
DROP POLICY IF EXISTS "Gestores podem ver logs de sua microrregião" ON public.activity_logs;
CREATE POLICY "Gestores podem ver logs de sua microrregião" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'gestor'
      AND (
        -- Ver atividades de usuários da mesma microrregião
        activity_logs.user_id IN (
          SELECT id FROM public.profiles p2
          WHERE p2.microregiao_id = profiles.microregiao_id
        )
      )
    )
  );

-- Qualquer usuário autenticado pode inserir logs (para registrar suas próprias ações)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs" ON public.activity_logs;
CREATE POLICY "Usuários autenticados podem inserir logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Comentário para documentação
COMMENT ON TABLE public.activity_logs IS 'Registros de atividades do sistema para auditoria e dashboard';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Tipo de ação: login, logout, user_created, user_updated, user_deactivated, lgpd_accepted, action_created, action_updated, action_deleted, view_micro';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Tipo de entidade afetada: auth, action, user, view';
COMMENT ON COLUMN public.activity_logs.entity_id IS 'ID da entidade afetada (opcional)';
COMMENT ON COLUMN public.activity_logs.metadata IS 'Dados adicionais em formato JSON';
