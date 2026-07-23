DO $$
DECLARE v_uid uuid;
BEGIN
  -- If admin already exists, do nothing
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@semeton.app') THEN
    RETURN;
  END IF;

  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    'admin@semeton.app', crypt('admin123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Master Admin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', 'admin@semeton.app', 'email_verified', true),
    'email', v_uid::text, now(), now(), now());

  -- Ensure profile marked as master (handle_new_user trigger inserts profile)
  INSERT INTO public.profiles (id, full_name, is_master)
  VALUES (v_uid, 'Master Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_master = true, full_name = 'Master Admin';

  -- Ensure super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;