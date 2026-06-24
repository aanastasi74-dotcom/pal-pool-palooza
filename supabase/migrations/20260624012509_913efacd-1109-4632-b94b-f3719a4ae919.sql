-- Backup
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.functions_pre_n31 (
  salvado_em timestamptz DEFAULT now(),
  nome text,
  definicao text
);
INSERT INTO backups.functions_pre_n31 (nome, definicao)
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN ('get_classificacao_grupo', 'get_classificacao_terceiros');

-- Refactor: fair_play from matches.estatisticas (aggregated yellow/red per team per match)
CREATE OR REPLACE FUNCTION public.get_classificacao_grupo(p_grupo text)
 RETURNS TABLE(posicao integer, team_id uuid, team_nome text, bandeira_emoji text, jogos integer, vitorias integer, empates integer, derrotas integer, gols_pro integer, gols_contra integer, saldo integer, pontos integer, cartoes_amarelos integer, cartoes_segundo_amarelo integer, cartoes_vermelhos integer, fair_play integer, classificado_top2 boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH grupo_teams AS (
    SELECT t.id, t.nome_pt, t.bandeira_emoji, t.codigo_api
    FROM public.teams t WHERE t.grupo = p_grupo
  ),
  grupo_matches AS (
    SELECT m.id, m.team_home_id, m.team_away_id, m.placar_casa, m.placar_fora, m.estatisticas
    FROM public.matches m
    WHERE m.status = 'encerrado'
      AND m.placar_casa IS NOT NULL AND m.placar_fora IS NOT NULL
      AND m.team_home_id IN (SELECT id FROM grupo_teams)
      AND m.team_away_id IN (SELECT id FROM grupo_teams)
  ),
  all_games AS (
    SELECT gm.id AS match_id, gm.team_home_id AS tid, gm.team_away_id AS opp,
           gm.placar_casa AS gf, gm.placar_fora AS ga
    FROM grupo_matches gm
    UNION ALL
    SELECT gm.id, gm.team_away_id, gm.team_home_id, gm.placar_fora, gm.placar_casa
    FROM grupo_matches gm
  ),
  base AS (
    SELECT t.id AS team_id, t.nome_pt, t.bandeira_emoji, t.codigo_api,
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
    SELECT b.*, (b.gols_pro - b.gols_contra)::int AS saldo,
      (b.vitorias * 3 + b.empates)::int AS pontos
    FROM base b
  ),
  -- Fair play lê de matches.estatisticas (agregado por time/jogo via API-Football).
  -- API-Football não retorna cartões individuais por jogador; aproximação suficiente
  -- pro propósito do bolão (fair play raramente decide desempate).
  cartoes_por_time_jogo AS (
    SELECT
      (team_stats->'team'->>'id')::int AS codigo_api,
      COALESCE(NULLIF(
        (SELECT s->>'value' FROM jsonb_array_elements(team_stats->'statistics') s
         WHERE s->>'type' = 'Yellow Cards' LIMIT 1), ''
      )::int, 0) AS amarelos,
      COALESCE(NULLIF(
        (SELECT s->>'value' FROM jsonb_array_elements(team_stats->'statistics') s
         WHERE s->>'type' = 'Red Cards' LIMIT 1), ''
      )::int, 0) AS vermelhos
    FROM grupo_matches gm,
    LATERAL jsonb_array_elements(COALESCE(gm.estatisticas, '[]'::jsonb)) AS team_stats
    WHERE team_stats ? 'team' AND team_stats ? 'statistics'
  ),
  cartoes_agg AS (
    SELECT codigo_api,
      SUM(amarelos)::int AS amarelos,
      SUM(vermelhos)::int AS vermelhos,
      SUM(amarelos * -1 + vermelhos * -4)::int AS fp
    FROM cartoes_por_time_jogo
    GROUP BY codigo_api
  ),
  com_cartoes AS (
    SELECT bp.*,
      COALESCE(ca.amarelos,0)::int AS am,
      0::int AS sa,
      COALESCE(ca.vermelhos,0)::int AS vm,
      COALESCE(ca.fp,0)::int AS fp
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
     AND ag.opp IN (SELECT tp2.team_id FROM tier_pts tp2 WHERE tp2.t1 = tp.t1 AND tp2.team_id <> tp.team_id)
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
  SELECT o.pos, o.team_id, o.nome_pt, o.bandeira_emoji,
    o.jogos, o.vitorias, o.empates, o.derrotas,
    o.gols_pro, o.gols_contra, o.saldo, o.pontos,
    o.am, o.sa, o.vm, o.fp,
    (o.pos <= 2) AS classificado_top2
  FROM ordered o
  ORDER BY o.pos;
END;
$function$;