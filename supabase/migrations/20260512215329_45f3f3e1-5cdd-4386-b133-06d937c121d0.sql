
DROP VIEW IF EXISTS public.vw_perebas_count;

CREATE VIEW public.vw_perebas_count
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.profiles WHERE COALESCE(role,'pereba') <> 'sistema')::int AS signups,
  (SELECT count(*) FROM public.invites
    WHERE status = 'pendente' AND (expira_em IS NULL OR expira_em > now()))::int AS convites_pendentes,
  ((SELECT count(*) FROM public.profiles WHERE COALESCE(role,'pereba') <> 'sistema') +
   (SELECT count(*) FROM public.invites
    WHERE status = 'pendente' AND (expira_em IS NULL OR expira_em > now())))::int AS total;

ALTER FUNCTION public.limite_perebas_hard() SET search_path = public;
ALTER FUNCTION public.limite_quotas_global_hard() SET search_path = public;
