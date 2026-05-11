
-- Fix 1: Remove forgeable audit_log INSERT policy. Audit writes must come via service role / SECURITY DEFINER only.
DROP POLICY IF EXISTS audit_insert_self ON public.audit_log;

-- Fix 2: Restrict personality_profiles SELECT to admins (observacoes_admin contains admin-only notes).
DROP POLICY IF EXISTS personality_select_authenticated ON public.personality_profiles;
CREATE POLICY personality_select_admin ON public.personality_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Fix 3: Explicit restrictive UPDATE policy on comprovantes-pix bucket so updates remain denied even if a permissive policy is added later.
DROP POLICY IF EXISTS "comprovantes_pix_no_update" ON storage.objects;
CREATE POLICY "comprovantes_pix_no_update" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'comprovantes-pix')
  WITH CHECK (bucket_id <> 'comprovantes-pix');
