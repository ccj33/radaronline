-- ==============================================================================
-- FIX: PERMISSÕES DE SEGURANÇA (RLS) - Teams e Analytics
-- ==============================================================================

-- 1. TABELA TEAMS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Leitura: Permitir que usuários autenticados vejam os times (para listar membros)
DROP POLICY IF EXISTS "Permitir leitura (Teams)" ON public.teams;
CREATE POLICY "Permitir leitura (Teams)" ON public.teams FOR SELECT TO authenticated USING (true);

-- Insert: Permitir Admins OU o próprio usuário (vinculando profile_id)
DROP POLICY IF EXISTS "Permitir insert (Teams)" ON public.teams;
CREATE POLICY "Permitir insert (Teams)" ON public.teams FOR INSERT TO authenticated
WITH CHECK (
    -- Admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    OR
    -- Próprio usuário (garantindo que o profile_id seja dele)
    profile_id = auth.uid()
);

-- Update: Permitir Admins OU dono do registro (profile_id) OU claiming por email
DROP POLICY IF EXISTS "Permitir update (Teams)" ON public.teams;
CREATE POLICY "Permitir update (Teams)" ON public.teams FOR UPDATE TO authenticated
USING (
    -- Admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    OR
    -- Dono do registro
    profile_id = auth.uid()
    OR
    -- Claiming de convite (registro antigo sem profile_id, validado por email do token)
    (profile_id IS NULL AND email = auth.jwt() ->> 'email')
);

-- Delete: Apenas Admins
DROP POLICY IF EXISTS "Permitir delete (Teams)" ON public.teams;
CREATE POLICY "Permitir delete (Teams)" ON public.teams FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- 2. TABELA USER_SESSIONS (Analytics - Sessões)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Select: Necessário para o retorno do INSERT (.select()) e para o usuário ver suas sessões
DROP POLICY IF EXISTS "Permitir select proprio (Sessions)" ON public.user_sessions;
CREATE POLICY "Permitir select proprio (Sessions)" ON public.user_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Insert: Apenas para o próprio usuário
DROP POLICY IF EXISTS "Permitir insert (Sessions)" ON public.user_sessions;
CREATE POLICY "Permitir insert (Sessions)" ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update: Apenas para o próprio usuário (para finalizar sessão)
DROP POLICY IF EXISTS "Permitir update (Sessions)" ON public.user_sessions;
CREATE POLICY "Permitir update (Sessions)" ON public.user_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- 3. TABELA USER_ANALYTICS (Analytics - Eventos)
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Select: Usuário pode ver seus eventos
DROP POLICY IF EXISTS "Permitir select proprio (Analytics)" ON public.user_analytics;
CREATE POLICY "Permitir select proprio (Analytics)" ON public.user_analytics FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Insert: Registrar eventos
DROP POLICY IF EXISTS "Permitir insert (Analytics)" ON public.user_analytics;
CREATE POLICY "Permitir insert (Analytics)" ON public.user_analytics FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
