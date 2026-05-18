CREATE OR REPLACE FUNCTION public.admin_list_usuarios()
RETURNS TABLE(
  id uuid,
  email text,
  nome text,
  apelido text,
  role text,
  ativo boolean,
  cor text,
  sigla text,
  limite_quotas_custom smallint,
  aceitou_regras_em timestamptz,
  email_regras_enviado_em timestamptz,
  notificacoes jsonb,
  created_at timestamptz,
  ultimo_acesso timestamptz,
  quotas_ativas integer,
  quotas_outras integer,
  quotas_total integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    p.id, p.email, p.nome, p.apelido, p.role, p.ativo, p.cor, p.sigla,
    p.limite_quotas_custom, p.aceitou_regras_em, p.email_regras_enviado_em,
    p.notificacoes, p.created_at,
    au.last_sign_in_at AS ultimo_acesso,
    COALESCE((SELECT count(*)::int FROM public.quotas q WHERE q.user_id = p.id AND q.status = 'ativa'), 0) AS quotas_ativas,
    COALESCE((SELECT count(*)::int FROM public.quotas q WHERE q.user_id = p.id AND q.status <> 'ativa'), 0) AS quotas_outras,
    COALESCE((SELECT count(*)::int FROM public.quotas q WHERE q.user_id = p.id), 0) AS quotas_total
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE public.is_admin()
  ORDER BY p.nome ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_usuarios() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_usuarios() TO authenticated;