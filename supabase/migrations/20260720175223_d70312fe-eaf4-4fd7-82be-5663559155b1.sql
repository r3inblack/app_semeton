
-- 1. Add is_master flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false;

-- 2. Seed master admin user (idempotent)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@semeton.app';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'admin@semeton.app', crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Master Admin"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@semeton.app', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    -- reset password to admin123 only if not already master-flagged? No: keep existing password.
    NULL;
  END IF;

  -- Ensure profile
  INSERT INTO public.profiles (id, full_name, is_master)
    VALUES (v_user_id, 'Master Admin', true)
    ON CONFLICT (id) DO UPDATE SET is_master = true, full_name = COALESCE(public.profiles.full_name, 'Master Admin');

  -- Ensure super_admin role
  INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- 3. Protect master profile/role from deletion via trigger
CREATE OR REPLACE FUNCTION public.protect_master_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    IF OLD.is_master THEN
      RAISE EXCEPTION 'User master tidak dapat dihapus';
    END IF;
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id AND is_master) THEN
      RAISE EXCEPTION 'Role user master tidak dapat diubah/dihapus';
    END IF;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_protect_master_profile ON public.profiles;
CREATE TRIGGER trg_protect_master_profile
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_master_user();

DROP TRIGGER IF EXISTS trg_protect_master_role ON public.user_roles;
CREATE TRIGGER trg_protect_master_role
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_master_user();
