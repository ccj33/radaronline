-- =====================================================
-- FIX: Correção da recursão infinita em is_admin_or_superadmin()
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- A função causa recursão porque consulta a tabela profiles
-- enquanto a política RLS de profiles também a chama.
-- 
-- SOLUÇÃO: Usar SECURITY DEFINER com search_path vazio
-- para que a consulta interna IGNORE as políticas RLS.

-- =====================================================
-- PASSO 1: Dropar as funções existentes
-- =====================================================
DROP FUNCTION IF EXISTS public.is_admin_or_superadmin();
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.get_user_microregiao();

-- =====================================================
-- PASSO 2: Recriar funções com SET search_path = ''
-- Isso faz a função bypassar RLS ao usar SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Busca o role diretamente, bypassa RLS com SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE 
   SET search_path = '';

-- Função para verificar se é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role = 'superadmin';
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE 
   SET search_path = '';

-- Função para obter microrregião do usuário
CREATE OR REPLACE FUNCTION public.get_user_microregiao()
RETURNS TEXT AS $$
DECLARE
  micro TEXT;
BEGIN
  SELECT microregiao_id INTO micro
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN micro;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE 
   SET search_path = '';

-- =====================================================
-- PASSO 3: Configurar permissões
-- =====================================================

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
-- PASSO 4: Notify PostgREST para recarregar schema
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICAÇÃO: Teste as funções (descomente para testar)
-- =====================================================
-- SELECT public.is_admin_or_superadmin();
-- SELECT public.is_superadmin();
-- SELECT public.get_user_microregiao();
