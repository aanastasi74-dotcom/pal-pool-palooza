
CREATE OR REPLACE FUNCTION public.get_classificacao_terceiros()
 RETURNS TABLE(posicao_geral integer, grupo text, team_id uuid, team_nome text, bandeira_emoji text, pontos integer, saldo integer, gols_pro integer, fair_play integer, fifa_ranking integer, classificado_r32 boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH grupos AS (
    SELECT unnest(ARRAY['A','B','C','D','E','F','G','H','I','J','K','L']) AS g
  ),
  terceiros AS (
    SELECT
      grupos.g AS grupo,
      c.team_id, c.team_nome, c.bandeira_emoji,
      c.pontos, c.saldo, c.gols_pro, c.fair_play,
      COALESCE(fr.posicao, 999) AS fifa_ranking
    FROM grupos
    CROSS JOIN LATERAL public.get_classificacao_grupo(grupos.g) c
    LEFT JOIN public.fifa_ranking fr ON fr.team_id = c.team_id
    WHERE c.posicao = 3
  ),
  ranked AS (
    SELECT t.*, ROW_NUMBER() OVER (ORDER BY
      pontos DESC, saldo DESC, gols_pro DESC, fair_play DESC, fifa_ranking ASC, team_nome ASC
    )::int AS pg
    FROM terceiros t
  )
  SELECT r.pg, r.grupo, r.team_id, r.team_nome, r.bandeira_emoji,
    r.pontos, r.saldo, r.gols_pro, r.fair_play, r.fifa_ranking,
    (r.pg <= 8) AS classificado_r32
  FROM ranked r
  ORDER BY r.pg;
$function$;
