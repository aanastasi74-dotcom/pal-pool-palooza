
-- Widen role check first
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','participante','sistema'));

-- Auth user (handle_new_user trigger creates the profile automatically)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
  email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'sistema@bolaodosperebas.com', '',
  now(), now(), now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"nome":"Sistema","apelido":"Sistema"}'::jsonb,
  false, '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Ensure profile is set to system role
UPDATE public.profiles
SET role = 'sistema', ativo = false, apelido = 'Sistema', nome = 'Sistema'
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
