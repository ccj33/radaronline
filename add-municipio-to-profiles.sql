-- =====================================
-- RADAR 2.0 - ADICIONA COLUNA MUNICÍPIO AO PROFILES
-- Execute este script no SQL Editor do Supabase
-- =====================================

-- Adiciona coluna municipio à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS municipio TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.municipio IS 'Município de atuação do usuário, preenchido durante o onboarding';

-- =====================================
-- FIM DA MIGRAÇÃO
-- =====================================
