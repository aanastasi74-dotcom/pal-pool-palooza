ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aceitou_regras_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_regras_enviado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_aceitou_regras
  ON public.profiles(aceitou_regras_em)
  WHERE aceitou_regras_em IS NOT NULL;

-- Admins already accepted (eles aprovaram o regulamento)
UPDATE public.profiles
   SET aceitou_regras_em = COALESCE(aceitou_regras_em, now())
 WHERE apelido IN ('ANASTA','ANAO','DOC') OR role = 'admin';

CREATE OR REPLACE FUNCTION public.aceitar_regras()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz;
  v_uid uuid;
  v_result timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sem sessão';
  END IF;
  v_now := now();
  UPDATE public.profiles
     SET aceitou_regras_em = COALESCE(aceitou_regras_em, v_now)
   WHERE id = v_uid
   RETURNING aceitou_regras_em INTO v_result;

  INSERT INTO public.audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (v_uid, 'aceitou_regras', 'profile', v_uid::text,
          jsonb_build_object('em', v_result));

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_regras() TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_email_regras_enviado()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_result timestamptz;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sem sessão';
  END IF;
  UPDATE public.profiles
     SET email_regras_enviado_em = COALESCE(email_regras_enviado_em, now())
   WHERE id = v_uid
   RETURNING email_regras_enviado_em INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_email_regras_enviado() TO authenticated;