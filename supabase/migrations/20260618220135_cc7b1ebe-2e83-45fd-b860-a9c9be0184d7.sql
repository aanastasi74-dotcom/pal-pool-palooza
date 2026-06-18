-- fifa_ranking (vazia por enquanto; populada em O.2)
CREATE TABLE IF NOT EXISTS public.fifa_ranking (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  posicao integer NOT NULL,
  pontos numeric,
  atualizado_em date NOT NULL DEFAULT current_date,
  fonte text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fifa_ranking TO anon, authenticated;
GRANT ALL ON public.fifa_ranking TO service_role;

ALTER TABLE public.fifa_ranking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fifa_ranking' AND policyname='fifa_ranking_select_all') THEN
    CREATE POLICY "fifa_ranking_select_all" ON public.fifa_ranking FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fifa_ranking_posicao ON public.fifa_ranking(posicao);

-- RPC: classificação ordenada de um grupo
CREATE OR REPLACE FUNCTION public.get_classificacao_grupo(p_grupo text)
RETURNS TABLE(
  posicao integer,
  team_id uuid,
  team_nome text,
  bandeira_emoji text,
  jogos integer,
  vitorias integer,
  empates integer,
  derrotas integer,
  gols_pro integer,
  gols_contra integer,
  saldo integer,
  pontos integer,
  cartoes_amarelos integer,
  cartoes_segundo_amarelo integer,
  cartoes_vermelhos integer,
  fair_play integer,
  classificado_top2 boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH grupo_teams AS (
    SELECT t.id, t.nome_pt, t.bandeira_emoji, t.codigo_api
    FROM public.teams t
    WHERE t.grupo = p_grupo
  ),
  grupo_matches AS (
    SELECT m.id, m.team_home_id, m.team_away_id, m.placar_casa, m.placar_fora, m.eventos
    FROM public.matches m
    WHERE m.status = 'encerrado'
      AND m.placar_casa IS NOT NULL
      AND m.placar_fora IS NOT NULL
      AND m.team_home_id IN (SELECT id FROM grupo_teams)
      AND m.team_away_id IN (SELECT id FROM grupo_teams)
  ),
  all_games AS (
    SELECT gm.id AS match_id, gm.team_home_id AS tid, gm.team_away_id AS opp,
           gm.placar_casa AS gf, gm.placar_fora AS ga
    FROM grupo_matches gm
    UNION ALL
    SELECT gm.id, gm.team_away_id, gm.team_home_id,
           gm.placar_fora, gm.placar_casa
    FROM grupo_matches gm
  ),
  base AS (
    SELECT
      t.id AS team_id, t.nome_pt, t.bandeira_emoji, t.codigo_api,
      COUNT(ag.match_id)::int AS jogos,
      COALESCE(SUM(CASE WHEN ag.gf > ag.ga THEN 1 ELSE 0 END),0)::int AS vitorias,
      COALESCE(SUM(CASE WHEN ag.gf = ag.ga THEN 1 ELSE 0 END),0)::int AS empates,
      COALESCE(SUM(CASE WHEN ag.gf < ag.ga THEN 1 ELSE 0 END),0)::int AS derrotas,
      COALESCE(SUM(ag.gf),0)::int AS gols_pro,
      COALESCE(SUM(ag.ga),0)::int AS gols_contra
    FROM grupo_teams t
    LEFT JOIN all_games ag ON ag.tid = t.id
    GROUP BY t.id, t.nome_pt, t.bandeira_emoji, t.codigo_api
  ),
  base_pts AS (
    SELECT b.*,
      (b.gols_pro - b.gols_contra)::int AS saldo,
      (b.vitorias * 3 + b.empates)::int AS pontos
    FROM base b
  ),
  cartoes AS (
    SELECT (ev->'team'->>'id')::int AS codigo_api,
           ev->>'detail' AS detalhe
    FROM grupo_matches gm,
    LATERAL jsonb_array_elements(COALESCE(gm.eventos, '[]'::jsonb)) ev
    WHERE ev->>'type' = 'Card'
  ),
  cartoes_agg AS (
    SELECT codigo_api,
      COUNT(*) FILTER (WHERE detalhe = 'Yellow Card')::int AS amarelos,
      COUNT(*) FILTER (WHERE detalhe = 'Second Yellow card')::int AS segundos,
      COUNT(*) FILTER (WHERE detalhe = 'Red Card')::int AS vermelhos
    FROM cartoes
    GROUP BY codigo_api
  ),
  com_cartoes AS (
    SELECT bp.*,
      COALESCE(ca.amarelos,0)::int AS am,
      COALESCE(ca.segundos,0)::int AS sa,
      COALESCE(ca.vermelhos,0)::int AS vm,
      -( COALESCE(ca.amarelos,0) + COALESCE(ca.segundos,0)*3 + COALESCE(ca.vermelhos,0)*4 )::int AS fp
    FROM base_pts bp
    LEFT JOIN cartoes_agg ca ON ca.codigo_api = bp.codigo_api
  ),
  tier_pts AS (
    SELECT cc.*, DENSE_RANK() OVER (ORDER BY cc.pontos DESC) AS t1
    FROM com_cartoes cc
  ),
  h2h AS (
    SELECT tp.team_id, tp.t1,
      COALESCE(SUM(CASE WHEN ag.gf > ag.ga THEN 3 WHEN ag.gf = ag.ga THEN 1 ELSE 0 END),0)::int AS h_pts,
      COALESCE(SUM(ag.gf - ag.ga),0)::int AS h_sg,
      COALESCE(SUM(ag.gf),0)::int AS h_gp
    FROM tier_pts tp
    LEFT JOIN all_games ag
      ON ag.tid = tp.team_id
     AND ag.opp IN (SELECT tp2.team_id FROM tier_pts tp2
                    WHERE tp2.t1 = tp.t1 AND tp2.team_id <> tp.team_id)
    GROUP BY tp.team_id, tp.t1
  ),
  ordered AS (
    SELECT tp.*, h.h_pts, h.h_sg, h.h_gp,
      COALESCE(fr.posicao, 999) AS fifa_pos,
      ROW_NUMBER() OVER (ORDER BY
        tp.pontos DESC,
        COALESCE(h.h_pts,0) DESC,
        COALESCE(h.h_sg,0) DESC,
        COALESCE(h.h_gp,0) DESC,
        tp.saldo DESC,
        tp.gols_pro DESC,
        tp.fp DESC,
        COALESCE(fr.posicao, 999) ASC,
        tp.nome_pt ASC
      )::int AS pos
    FROM tier_pts tp
    LEFT JOIN h2h h ON h.team_id = tp.team_id
    LEFT JOIN public.fifa_ranking fr ON fr.team_id = tp.team_id
  )
  SELECT
    o.pos,
    o.team_id, o.nome_pt, o.bandeira_emoji,
    o.jogos, o.vitorias, o.empates, o.derrotas,
    o.gols_pro, o.gols_contra, o.saldo, o.pontos,
    o.am, o.sa, o.vm, o.fp,
    (o.pos <= 2) AS classificado_top2
  FROM ordered o
  ORDER BY o.pos;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_classificacao_grupo(text) TO anon, authenticated, service_role;