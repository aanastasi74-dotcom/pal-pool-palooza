CREATE OR REPLACE FUNCTION public.get_palpites_jogo(p_match_id uuid)
RETURNS TABLE(
  quota_id uuid,
  quota_numero integer,
  user_id uuid,
  apelido text,
  sigla text,
  cor text,
  placar_casa integer,
  placar_fora integer,
  pontos integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.quota_id, q.numero, q.user_id, p.apelido, p.sigla, p.cor,
         pr.placar_casa, pr.placar_fora, pr.pontos_calculados
  FROM public.matches m
  JOIN public.predictions pr ON pr.match_id = m.id
  JOIN public.quotas q ON q.id = pr.quota_id AND q.status = 'ativa'
  JOIN public.profiles p ON p.id = q.user_id
  WHERE m.id = p_match_id
    AND m.travado_em IS NOT NULL
    AND m.travado_em <= now()
    AND COALESCE(p.role, 'pereba') <> 'sistema'
  ORDER BY p.apelido ASC, q.numero ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_palpites_jogo(uuid) TO authenticated;