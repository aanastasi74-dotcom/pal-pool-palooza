
-- Restrict profiles SELECT to self or admin; add public RPC for safe display fields
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;

CREATE POLICY profiles_select_self_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.get_profile_public(p_user_id uuid)
RETURNS TABLE(id uuid, nome text, apelido text, cor text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, nome, apelido, cor FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Fix mutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.set_top4_peso_on_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.peso_no_palpite := public.get_peso_top4_atual();
  RETURN NEW;
END;
$$;
