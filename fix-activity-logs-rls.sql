-- =====================================
-- CORREÇÃO: Políticas RLS para activity_logs
-- Execute este SQL no Supabase
-- =====================================

-- Permitir que qualquer usuário autenticado insira logs
-- (não apenas para seu próprio user_id - necessário para Edge Functions)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Também permitir INSERT via service role (Edge Functions)
-- Service role já bypassa RLS, mas garantimos a permissão

-- Verificar se as políticas de SELECT estão corretas
-- Admins podem ver todos os logs
DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.activity_logs;
CREATE POLICY "Admins podem ver todos os logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Logs são imutáveis (sem update/delete)
DROP POLICY IF EXISTS "Logs são imutáveis - no update" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no update" ON public.activity_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Logs são imutáveis - no delete" ON public.activity_logs;
CREATE POLICY "Logs são imutáveis - no delete" ON public.activity_logs
  FOR DELETE USING (false);

-- =====================================
-- VERIFICAÇÃO: Listar policies
-- =====================================
SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'activity_logs';
