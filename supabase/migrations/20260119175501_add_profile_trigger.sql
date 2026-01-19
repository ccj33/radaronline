-- Migration: Add Profile Trigger
-- Description: Automatically creates a profile in public.profiles when a user is created in auth.users
-- Date: 2024-01-20

-- 1. Create the function that handles the new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, ativo, first_access)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), -- Use metadata name or fallback to email prefix
    COALESCE(new.raw_user_meta_data->>'role', 'usuario'), -- Default role
    TRUE, -- Default active
    TRUE -- Default first access
  )
  ON CONFLICT (id) DO NOTHING; -- Avoid crashing if profile already exists
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows bypassing RLS

-- 2. Create the trigger
-- Drop if exists to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Grant necessary permissions (Review if needed)
-- Usually SECURITY DEFINER handles this, but ensuring public can execute the function is good practice (though it's triggered internally)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;
