CREATE OR REPLACE FUNCTION public.get_ranking_detalhado()
RETURNS TABLE(
  posicao bigint,
  quota_id uuid,
  quota_numero integer,
  user_id uuid,
  nome text,
  apelido text,
  sigla text,
  cor text,
  pontos integer,
  exatos bigint,
  resultados bigint,
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
    classificacao AS (
      SELECT
        pr.quota_id,
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
      FROM public.matches m
      JOIN public.predictions pr ON pr.match_id = m.id
      WHERE m.status = 'encerrado'
        AND m.placar_casa IS NOT NULL
        AND m.placar_fora IS NOT NULL
        AND pr.placar_casa IS NOT NULL
        AND pr.placar_fora IS NOT NULL
    ),
    breakdown AS (
      SELECT
        quota_id,
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
    total_encerrados AS (
      SELECT COUNT(*)::integer AS jec
      FROM public.matches
      WHERE status = 'encerrado'
        AND placar_casa IS NOT NULL
        AND placar_fora IS NOT NULL
    )
  SELECT
    r.posicao,
    r.quota_id,
    r.numero AS quota_numero,
    r.user_id,
    r.nome,
    r.apelido,
    r.sigla,
    r.cor,
    r.pontos,
    r.exatos,
    r.resultados,
    r.variacao,
    te.jec,
    COALESCE(b.pex, 0)::integer AS pex,
    COALESCE(b.rdf, 0)::integer AS rdf,
    COALESCE(b.rgm, 0)::integer AS rgm,
    COALESCE(b.rgv, 0)::integer AS rgv,
    COALESCE(b.res, 0)::integer AS res,
    COALESCE(b.jzr, 0)::integer AS jzr,
    (te.jec - COALESCE(b.total_palpitou, 0))::integer AS npt
  FROM public.get_ranking_geral() r
  LEFT JOIN breakdown b ON b.quota_id = r.quota_id
  CROSS JOIN total_encerrados te
  ORDER BY r.posicao ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ranking_detalhado() TO authenticated, anon, service_role;