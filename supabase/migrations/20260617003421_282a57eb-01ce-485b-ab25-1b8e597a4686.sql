DROP FUNCTION IF EXISTS public.get_ranking_diario(date);

CREATE OR REPLACE FUNCTION public.get_ranking_diario(
  p_data date DEFAULT current_date
)
RETURNS TABLE(
  posicao integer,
  quota_id uuid,
  quota_numero integer,
  user_id uuid,
  apelido text,
  sigla text,
  cor text,
  pontos integer,
  variacao integer,
  jec integer,
  pex integer,
  rdf integer,
  rgm integer,
  rgv integer,
  res integer,
  jzr integer,
  npt integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH
    matches_do_dia AS (
      SELECT id, peso, placar_casa, placar_fora
      FROM public.matches
      WHERE status = 'encerrado'
        AND (data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = p_data
        AND placar_casa IS NOT NULL
        AND placar_fora IS NOT NULL
    ),
    classificacao AS (
      SELECT
        pr.quota_id,
        pr.pontos_calculados,
        CASE
          WHEN pr.placar_casa = m.placar_casa
               AND pr.placar_fora = m.placar_fora THEN 'PEX'
          WHEN SIGN(pr.placar_casa - pr.placar_fora)
               = SIGN(m.placar_casa - m.placar_fora) THEN
            CASE
              WHEN (pr.placar_casa - pr.placar_fora)
                   = (m.placar_casa - m.placar_fora) THEN 'RDF'
              WHEN pr.placar_casa = m.placar_casa THEN 'RGM'
              WHEN pr.placar_fora = m.placar_fora THEN 'RGV'
              ELSE 'RES'
            END
          ELSE 'JZR'
        END AS categoria
      FROM matches_do_dia m
      JOIN public.predictions pr ON pr.match_id = m.id
    ),
    breakdown AS (
      SELECT
        quota_id,
        SUM(pontos_calculados)::integer AS pontos_dia,
        COUNT(*) FILTER (WHERE categoria = 'PEX')::integer AS pex,
        COUNT(*) FILTER (WHERE categoria = 'RDF')::integer AS rdf,
        COUNT(*) FILTER (WHERE categoria = 'RGM')::integer AS rgm,
        COUNT(*) FILTER (WHERE categoria = 'RGV')::integer AS rgv,
        COUNT(*) FILTER (WHERE categoria = 'RES')::integer AS res,
        COUNT(*) FILTER (WHERE categoria = 'JZR')::integer AS jzr,
        COUNT(*)::integer AS total_palpitou
      FROM classificacao
      GROUP BY quota_id
    ),
    jec_do_dia AS (
      SELECT COUNT(*)::integer AS jec FROM matches_do_dia
    )
  SELECT
    (ROW_NUMBER() OVER (
      ORDER BY COALESCE(b.pontos_dia, 0) DESC, q.created_at ASC
    ))::integer AS posicao,
    q.id AS quota_id,
    q.numero AS quota_numero,
    q.user_id,
    p.apelido,
    COALESCE(NULLIF(p.sigla, ''), UPPER(LEFT(p.apelido, 3))) AS sigla,
    p.cor,
    COALESCE(b.pontos_dia, 0)::integer AS pontos,
    NULL::integer AS variacao,
    j.jec,
    COALESCE(b.pex, 0)::integer AS pex,
    COALESCE(b.rdf, 0)::integer AS rdf,
    COALESCE(b.rgm, 0)::integer AS rgm,
    COALESCE(b.rgv, 0)::integer AS rgv,
    COALESCE(b.res, 0)::integer AS res,
    COALESCE(b.jzr, 0)::integer AS jzr,
    (j.jec - COALESCE(b.total_palpitou, 0))::integer AS npt
  FROM public.quotas q
  JOIN public.profiles p ON p.id = q.user_id
  LEFT JOIN breakdown b ON b.quota_id = q.id
  CROSS JOIN jec_do_dia j
  WHERE q.status = 'ativa'
    AND COALESCE(p.role, 'pereba') <> 'sistema'
  ORDER BY pontos DESC, q.created_at ASC;
$function$;