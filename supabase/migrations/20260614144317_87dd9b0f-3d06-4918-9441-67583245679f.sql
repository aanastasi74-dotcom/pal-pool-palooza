DROP FUNCTION IF EXISTS public.get_palpites_jogo(uuid);

CREATE FUNCTION public.get_palpites_jogo(p_match_id uuid)
RETURNS TABLE(
  quota_id uuid,
  quota_numero integer,
  user_id uuid,
  apelido text,
  sigla text,
  cor text,
  placar_casa integer,
  placar_fora integer,
  pontos integer,
  posicao_ranking integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH ranking_snapshot AS (
    SELECT quota_id, posicao FROM public.get_ranking_geral()
  )
  SELECT
    pr.quota_id,
    q.numero AS quota_numero,
    q.user_id,
    p.apelido,
    COALESCE(NULLIF(p.sigla, ''), UPPER(LEFT(p.apelido, 3))) AS sigla,
    p.cor,
    pr.placar_casa,
    pr.placar_fora,
    pr.pontos_calculados::integer AS pontos,
    COALESCE(rs.posicao, 999)::integer AS posicao_ranking
  FROM public.matches m
  JOIN public.predictions pr ON pr.match_id = m.id
  JOIN public.quotas q ON q.id = pr.quota_id AND q.status = 'ativa'
  JOIN public.profiles p ON p.id = q.user_id
  LEFT JOIN ranking_snapshot rs ON rs.quota_id = pr.quota_id
  WHERE m.id = p_match_id
    AND m.travado_em IS NOT NULL
    AND m.travado_em <= now()
    AND COALESCE(p.role, 'pereba') <> 'sistema'
  ORDER BY p.apelido ASC, q.numero ASC;
$function$;