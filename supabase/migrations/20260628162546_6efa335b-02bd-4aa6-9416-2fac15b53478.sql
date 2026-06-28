
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.functions_pre_p2 (
  proname text PRIMARY KEY,
  definicao text NOT NULL,
  salvo_em timestamptz NOT NULL DEFAULT now()
);
INSERT INTO backups.functions_pre_p2 (proname, definicao)
SELECT proname, pg_get_functiondef(oid) FROM pg_proc
WHERE proname IN ('get_ranking_detalhado','get_ranking_diario')
ON CONFLICT (proname) DO UPDATE SET definicao=EXCLUDED.definicao, salvo_em=now();

INSERT INTO public.settings (key, value)
VALUES ('top4_publico_a_partir_de', '"2026-07-04T15:00:00Z"'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.get_ranking_detalhado();
DROP FUNCTION IF EXISTS public.get_ranking_diario(date);

CREATE OR REPLACE FUNCTION public.get_ranking_detalhado()
 RETURNS TABLE(posicao bigint, quota_id uuid, quota_numero integer, user_id uuid, nome text, apelido text, sigla text, cor text, pontos integer, exatos bigint, resultados bigint, variacao integer, jec integer, pex integer, rdf integer, rgm integer, rgv integer, res integer, jzr integer, npt integer, aproveitamento_pct integer, top4_p1 text, top4_p2 text, top4_p3 text, top4_p4 text, top4_peso integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH
    classificacao AS (
      SELECT pr.quota_id,
        CASE
          WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 'PEX'
          WHEN SIGN(pr.placar_casa - pr.placar_fora) = SIGN(m.placar_casa - m.placar_fora) THEN
            CASE
              WHEN (pr.placar_casa - pr.placar_fora) = (m.placar_casa - m.placar_fora) THEN 'RDF'
              WHEN pr.placar_casa = m.placar_casa THEN 'RGM'
              WHEN pr.placar_fora = m.placar_fora THEN 'RGV'
              ELSE 'RES'
            END
          ELSE 'JZR'
        END AS categoria
      FROM public.matches m
      JOIN public.predictions pr ON pr.match_id = m.id
      WHERE m.status = 'encerrado' AND m.placar_casa IS NOT NULL AND m.placar_fora IS NOT NULL
        AND pr.placar_casa IS NOT NULL AND pr.placar_fora IS NOT NULL
    ),
    breakdown AS (
      SELECT quota_id,
        COUNT(*) FILTER (WHERE categoria='PEX')::integer AS pex,
        COUNT(*) FILTER (WHERE categoria='RDF')::integer AS rdf,
        COUNT(*) FILTER (WHERE categoria='RGM')::integer AS rgm,
        COUNT(*) FILTER (WHERE categoria='RGV')::integer AS rgv,
        COUNT(*) FILTER (WHERE categoria='RES')::integer AS res,
        COUNT(*) FILTER (WHERE categoria='JZR')::integer AS jzr,
        COUNT(*)::integer AS total_palpitou
      FROM classificacao GROUP BY quota_id
    ),
    total_encerrados AS (
      SELECT COUNT(*)::integer AS jec FROM public.matches
      WHERE status='encerrado' AND placar_casa IS NOT NULL AND placar_fora IS NOT NULL
    )
  SELECT r.posicao, r.quota_id, r.numero AS quota_numero, r.user_id, r.nome, r.apelido, r.sigla, r.cor,
    r.pontos, r.exatos, r.resultados, r.variacao,
    te.jec,
    COALESCE(b.pex,0)::integer, COALESCE(b.rdf,0)::integer, COALESCE(b.rgm,0)::integer,
    COALESCE(b.rgv,0)::integer, COALESCE(b.res,0)::integer, COALESCE(b.jzr,0)::integer,
    (te.jec - COALESCE(b.total_palpitou,0))::integer AS npt,
    CASE WHEN COALESCE(b.total_palpitou,0)=0 THEN NULL
      ELSE ROUND(100.0*(COALESCE(b.pex,0)+COALESCE(b.rdf,0)+COALESCE(b.rgm,0)+COALESCE(b.rgv,0)+COALESCE(b.res,0))
             / COALESCE(b.total_palpitou,0))::integer END AS aproveitamento_pct,
    t4.posicao_1, t4.posicao_2, t4.posicao_3, t4.posicao_4, t4.peso_no_palpite::integer
  FROM public.get_ranking_geral() r
  LEFT JOIN breakdown b ON b.quota_id = r.quota_id
  LEFT JOIN public.top4_predictions t4 ON t4.quota_id = r.quota_id
  CROSS JOIN total_encerrados te
  ORDER BY r.posicao ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_ranking_diario(p_data date DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo'::text))::date)
 RETURNS TABLE(posicao integer, quota_id uuid, quota_numero integer, user_id uuid, apelido text, sigla text, cor text, pontos integer, variacao integer, jec integer, pex integer, rdf integer, rgm integer, rgv integer, res integer, jzr integer, npt integer, aproveitamento_pct integer, top4_p1 text, top4_p2 text, top4_p3 text, top4_p4 text, top4_peso integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH
    matches_do_dia AS (
      SELECT id, peso, placar_casa, placar_fora FROM public.matches
      WHERE status='encerrado' AND (data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = p_data
        AND placar_casa IS NOT NULL AND placar_fora IS NOT NULL
    ),
    classificacao AS (
      SELECT pr.quota_id, pr.pontos_calculados,
        CASE
          WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 'PEX'
          WHEN SIGN(pr.placar_casa - pr.placar_fora) = SIGN(m.placar_casa - m.placar_fora) THEN
            CASE
              WHEN (pr.placar_casa - pr.placar_fora) = (m.placar_casa - m.placar_fora) THEN 'RDF'
              WHEN pr.placar_casa = m.placar_casa THEN 'RGM'
              WHEN pr.placar_fora = m.placar_fora THEN 'RGV'
              ELSE 'RES'
            END
          ELSE 'JZR'
        END AS categoria
      FROM matches_do_dia m JOIN public.predictions pr ON pr.match_id = m.id
    ),
    breakdown AS (
      SELECT quota_id, SUM(pontos_calculados)::integer AS pontos_dia,
        COUNT(*) FILTER (WHERE categoria='PEX')::integer AS pex,
        COUNT(*) FILTER (WHERE categoria='RDF')::integer AS rdf,
        COUNT(*) FILTER (WHERE categoria='RGM')::integer AS rgm,
        COUNT(*) FILTER (WHERE categoria='RGV')::integer AS rgv,
        COUNT(*) FILTER (WHERE categoria='RES')::integer AS res,
        COUNT(*) FILTER (WHERE categoria='JZR')::integer AS jzr,
        COUNT(*)::integer AS total_palpitou
      FROM classificacao GROUP BY quota_id
    ),
    jec_do_dia AS ( SELECT COUNT(*)::integer AS jec FROM matches_do_dia )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY COALESCE(b.pontos_dia,0) DESC, q.created_at ASC))::integer AS posicao,
    q.id, q.numero, q.user_id, p.apelido,
    COALESCE(NULLIF(p.sigla,''), UPPER(LEFT(p.apelido,3))) AS sigla,
    p.cor,
    COALESCE(b.pontos_dia,0)::integer AS pontos,
    NULL::integer AS variacao,
    j.jec,
    COALESCE(b.pex,0)::integer, COALESCE(b.rdf,0)::integer, COALESCE(b.rgm,0)::integer,
    COALESCE(b.rgv,0)::integer, COALESCE(b.res,0)::integer, COALESCE(b.jzr,0)::integer,
    (j.jec - COALESCE(b.total_palpitou,0))::integer AS npt,
    CASE WHEN COALESCE(b.total_palpitou,0)=0 THEN NULL
      ELSE ROUND(100.0*(COALESCE(b.pex,0)+COALESCE(b.rdf,0)+COALESCE(b.rgm,0)+COALESCE(b.rgv,0)+COALESCE(b.res,0))
             / COALESCE(b.total_palpitou,0))::integer END AS aproveitamento_pct,
    t4.posicao_1, t4.posicao_2, t4.posicao_3, t4.posicao_4, t4.peso_no_palpite::integer
  FROM public.quotas q
  JOIN public.profiles p ON p.id = q.user_id
  LEFT JOIN breakdown b ON b.quota_id = q.id
  LEFT JOIN public.top4_predictions t4 ON t4.quota_id = q.id
  CROSS JOIN jec_do_dia j
  WHERE q.status='ativa' AND COALESCE(p.role,'pereba') <> 'sistema'
  ORDER BY pontos DESC, q.created_at ASC;
$function$;
