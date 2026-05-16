ALTER VIEW public.vw_capacidade_infra SET (security_invoker = true);
ALTER VIEW public.vw_emails_enviados_mes SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.auto_numerar_quota_ao_ativar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'ativa' AND OLD.status <> 'ativa' AND NEW.numero IS NULL THEN
    NEW.numero := public.proximo_numero_quota(NEW.user_id);
  END IF;
  RETURN NEW;
END $function$;