-- ==============================================================================
-- FIX: PERMISSÕES DE SEGURANÇA (RLS) - Actions
-- ==============================================================================

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Permitir leitura para todos autenticados (ou filtrar por macro/micro se necessário)
-- Por enquanto, vamos permitir ver todas as ações para simplificar, já que o front filtra.
DROP POLICY IF EXISTS "Permitir leitura (Actions)" ON public.actions;
CREATE POLICY "Permitir leitura (Actions)" ON public.actions FOR SELECT TO authenticated USING (true);

-- 2. INSERT: Permitir criar ações (qualquer autenticado ou apenas com role?)
-- Vamos permitir autenticados, pois o back deve validar lógica de negócio
DROP POLICY IF EXISTS "Permitir insert (Actions)" ON public.actions;
CREATE POLICY "Permitir insert (Actions)" ON public.actions FOR INSERT TO authenticated WITH CHECK (true);

-- 3. UPDATE: Permitir atualização
-- Admin pode tudo.
-- Criador pode editar?
-- Responsável (RACI) pode editar?
-- Vamos permitir editar se for autenticado por enquanto, para destravar o usuário.
-- O ideal é refinar depois.
DROP POLICY IF EXISTS "Permitir update (Actions)" ON public.actions;
CREATE POLICY "Permitir update (Actions)" ON public.actions FOR UPDATE TO authenticated USING (true);

-- 4. DELETE: Apenas Admins ou Criador
DROP POLICY IF EXISTS "Permitir delete (Actions)" ON public.actions;
CREATE POLICY "Permitir delete (Actions)" ON public.actions FOR DELETE TO authenticated
USING (
    -- Admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    OR
    -- Criador (se tiver created_by)
    created_by = auth.uid()
);

-- ==============================================================================
-- FIX: PERMISSÕES DE SEGURANÇA (RLS) - Action RACI e Comments
-- ==============================================================================

-- Action RACI
ALTER TABLE public.action_raci ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo (RACI)" ON public.action_raci;
CREATE POLICY "Permitir tudo (RACI)" ON public.action_raci FOR ALL TO authenticated USING (true);

-- Action Comments
ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo (Comments)" ON public.action_comments;
CREATE POLICY "Permitir tudo (Comments)" ON public.action_comments FOR ALL TO authenticated USING (true);
