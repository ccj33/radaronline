-- ==============================================================================
-- OTIMIZAÇÃO SUPABASE - CUSTOM CLAIMS (SEGURA)
-- Versão 2: Usa app_metadata para dados sensíveis (Role, Região)
-- ==============================================================================

-- 1. Função Trigger Sincronizada
CREATE OR REPLACE FUNCTION public.sync_profile_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET 
    -- Dados de Apresentação (User Metadata - "Público")
    raw_user_meta_data = 
      coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'nome', NEW.nome,
        'avatar_id', NEW.avatar_id,
        'municipio', NEW.municipio
      ),
    -- Dados de Segurança/Lógica (App Metadata - Protegido)
    raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', NEW.role,
        'microregiao_id', NEW.microregiao_id,
        'ativo', NEW.ativo
      )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger
DROP TRIGGER IF EXISTS on_profile_update_sync_metadata ON public.profiles;

CREATE TRIGGER on_profile_update_sync_metadata
AFTER UPDATE OR INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_to_metadata();

-- 3. Backfill (Atualizar usuários existentes)
DO $$
DECLARE
  profile RECORD;
BEGIN
  FOR profile IN SELECT * FROM public.profiles LOOP
    UPDATE auth.users
    SET 
      raw_user_meta_data = 
        coalesce(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'nome', profile.nome,
          'avatar_id', profile.avatar_id,
          'municipio', profile.municipio
        ),
      raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'role', profile.role,
          'microregiao_id', profile.microregiao_id,
          'ativo', profile.ativo
        )
    WHERE id = profile.id;
  END LOOP;
END;
$$;
