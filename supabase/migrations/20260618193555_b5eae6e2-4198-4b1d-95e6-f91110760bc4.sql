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
  WITH 
    match_info AS (
      SELECT id, peso, placar_casa AS m_pc, placar_fora AS m_pf, status, travado_em
      FROM public.matches WHERE id = p_match_id
    ),
    ranking_snapshot AS (
      SELECT quota_id, posicao FROM public.get_ranking_geral()
    )
  SELECT
    q.id AS quota_id,
    q.numero AS quota_numero,
    q.user_id,
    p.apelido,
    COALESCE(NULLIF(p.sigla, ''), UPPER(LEFT(p.apelido, 3))) AS sigla,
    p.cor,
    pr.placar_casa,
    pr.placar_fora,
    (CASE
       WHEN pr.id IS NULL THEN 0
       WHEN m.status = 'encerrado' THEN COALESCE(pr.pontos_calculados, 0)
       WHEN m.m_pc IS NULL OR m.m_pf IS NULL THEN 0
       WHEN SIGN(pr.placar_casa - pr.placar_fora) <> SIGN(m.m_pc - m.m_pf) THEN 0
       WHEN pr.placar_casa = m.m_pc AND pr.placar_fora = m.m_pf THEN 12 * m.peso
       ELSE (
         4 +
         (CASE WHEN pr.placar_casa = m.m_pc THEN 1 ELSE 0 END) +
         (CASE WHEN pr.placar_fora = m.m_pf THEN 1 ELSE 0 END) +
         (CASE WHEN (pr.placar_casa - pr.placar_fora) = (m.m_pc - m.m_pf) THEN 2 ELSE 0 END)
       ) * m.peso
     END)::integer AS pontos,
    COALESCE(rs.posicao, 999)::integer AS posicao_ranking
  FROM public.quotas q
  JOIN public.profiles p ON p.id = q.user_id
  CROSS JOIN match_info m
  LEFT JOIN public.predictions pr ON pr.quota_id = q.id AND pr.match_id = p_match_id
  LEFT JOIN ranking_snapshot rs ON rs.quota_id = q.id
  WHERE q.status = 'ativa'
    AND m.travado_em IS NOT NULL
    AND m.travado_em <= now()
    AND COALESCE(p.role, 'pereba') <> 'sistema'
  ORDER BY p.apelido ASC, q.numero ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_palpites_jogo(uuid) TO authenticated, anon, service_role;