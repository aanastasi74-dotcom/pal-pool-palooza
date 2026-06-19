
-- ============================================================
-- Backup
-- ============================================================
CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.matches_pre_o2;
CREATE TABLE backups.matches_pre_o2 AS TABLE public.matches;

-- ============================================================
-- Parte 5: colunas em matches
-- ============================================================
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS alocacao_provisoria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alocacao_admin_override boolean NOT NULL DEFAULT false;

UPDATE public.matches SET alocacao_provisoria = false WHERE fase = 'grupos';

-- ============================================================
-- Parte 4: schema r32_terceiros_combinations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.r32_terceiros_combinations (
  id integer PRIMARY KEY,
  grupos_qualificados text[],
  vs_1a text NOT NULL,
  vs_1b text NOT NULL,
  vs_1d text NOT NULL,
  vs_1e text NOT NULL,
  vs_1g text NOT NULL,
  vs_1i text NOT NULL,
  vs_1k text NOT NULL,
  vs_1l text NOT NULL
);

GRANT SELECT ON public.r32_terceiros_combinations TO authenticated;
GRANT ALL ON public.r32_terceiros_combinations TO service_role;

ALTER TABLE public.r32_terceiros_combinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "r32_combos_read_authenticated" ON public.r32_terceiros_combinations;
CREATE POLICY "r32_combos_read_authenticated"
  ON public.r32_terceiros_combinations FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_r32_combinations_grupos
  ON public.r32_terceiros_combinations USING gin(grupos_qualificados);

-- ============================================================
-- Parte 2: refinar get_classificacao_grupo (fair play correto)
-- ============================================================
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
    SELECT m.id, m.team_home_id, m.team_away_id, m.placar_casa, m.placar_fora, m.eventos
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
  eventos_cartao AS (
    SELECT gm.id AS match_id,
           (ev->'team'->>'id')::int AS codigo_api,
           COALESCE(ev->'player'->>'id', ev->'player'->>'name', '?') AS player_id,
           ev->>'detail' AS detalhe
    FROM grupo_matches gm,
    LATERAL jsonb_array_elements(COALESCE(gm.eventos, '[]'::jsonb)) ev
    WHERE ev->>'type' = 'Card'
  ),
  cartoes_por_jogador AS (
    SELECT codigo_api, player_id, match_id,
      BOOL_OR(detalhe = 'Yellow Card') AS teve_amarelo,
      BOOL_OR(detalhe = 'Second Yellow card') AS teve_seg_am,
      BOOL_OR(detalhe = 'Red Card') AS teve_vermelho
    FROM eventos_cartao
    GROUP BY codigo_api, player_id, match_id
  ),
  deducao_por_jogador AS (
    SELECT codigo_api,
      CASE
        WHEN teve_amarelo AND teve_vermelho THEN -5
        WHEN teve_vermelho THEN -4
        WHEN teve_seg_am THEN -3
        WHEN teve_amarelo THEN -1
        ELSE 0
      END AS deducao,
      teve_amarelo, teve_seg_am, teve_vermelho
    FROM cartoes_por_jogador
  ),
  cartoes_agg AS (
    SELECT codigo_api,
      SUM(CASE WHEN teve_amarelo AND NOT teve_seg_am AND NOT teve_vermelho THEN 1 ELSE 0 END)::int AS amarelos,
      SUM(CASE WHEN teve_seg_am THEN 1 ELSE 0 END)::int AS segundos,
      SUM(CASE WHEN teve_vermelho THEN 1 ELSE 0 END)::int AS vermelhos,
      SUM(deducao)::int AS fp
    FROM deducao_por_jogador
    GROUP BY codigo_api
  ),
  com_cartoes AS (
    SELECT bp.*,
      COALESCE(ca.amarelos,0)::int AS am,
      COALESCE(ca.segundos,0)::int AS sa,
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

-- ============================================================
-- Parte 3: get_classificacao_terceiros
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_classificacao_terceiros()
 RETURNS TABLE(posicao_geral integer, grupo text, team_id uuid, team_nome text, bandeira_emoji text, pontos integer, saldo integer, gols_pro integer, fair_play integer, fifa_ranking integer, classificado_r32 boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grupos text[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L'];
  v_grupo text;
BEGIN
  DROP TABLE IF EXISTS _terceiros;
  CREATE TEMP TABLE _terceiros (
    grupo text, team_id uuid, team_nome text, bandeira_emoji text,
    pontos int, saldo int, gols_pro int, fair_play int, fifa_ranking int
  ) ON COMMIT DROP;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    INSERT INTO _terceiros
    SELECT v_grupo, c.team_id, c.team_nome, c.bandeira_emoji,
      c.pontos, c.saldo, c.gols_pro, c.fair_play,
      COALESCE(fr.posicao, 999)
    FROM public.get_classificacao_grupo(v_grupo) c
    LEFT JOIN public.fifa_ranking fr ON fr.team_id = c.team_id
    WHERE c.posicao = 3;
  END LOOP;

  RETURN QUERY
  WITH ranked AS (
    SELECT t.*, ROW_NUMBER() OVER (ORDER BY
      pontos DESC, saldo DESC, gols_pro DESC, fair_play DESC, fifa_ranking ASC, team_nome ASC
    )::int AS pg
    FROM _terceiros t
  )
  SELECT r.pg, r.grupo, r.team_id, r.team_nome, r.bandeira_emoji,
    r.pontos, r.saldo, r.gols_pro, r.fair_play, r.fifa_ranking,
    (r.pg <= 8) AS classificado_r32
  FROM ranked r
  ORDER BY r.pg;
END;
$function$;

-- ============================================================
-- Helper de alocação (definido antes da função principal)
-- ============================================================
CREATE OR REPLACE FUNCTION public._aplicar_alocacao_r32(
  p_numero_jogo int, p_home uuid, p_away uuid,
  p_fase_completa boolean, p_force_reset boolean
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_home IS NULL OR p_away IS NULL THEN RETURN; END IF;
  UPDATE public.matches
  SET team_home_id = p_home,
      team_away_id = p_away,
      alocacao_provisoria = NOT p_fase_completa,
      alocacao_admin_override = CASE WHEN p_force_reset THEN false ELSE alocacao_admin_override END
  WHERE numero_jogo = p_numero_jogo
    AND (p_force_reset OR alocacao_admin_override = false);
END;
$function$;

-- ============================================================
-- Parte 6: resolve_mata_mata_round_of_32
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_mata_mata_round_of_32(
  p_force_admin_override_reset boolean DEFAULT false
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fase_grupos_completa boolean;
  v_jogos_encerrados int;
  v_atualizados int := 0;
  v_protegidos int := 0;
  v_combo record;
  v_grupos_qualif text[];
  v_top1 jsonb := '{}'::jsonb;
  v_top2 jsonb := '{}'::jsonb;
  v_top3 jsonb := '{}'::jsonb;
  v_grupo text;
  v_grupos text[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L'];
  r record;
BEGIN
  SELECT COUNT(*) INTO v_jogos_encerrados
  FROM matches WHERE numero_jogo BETWEEN 1 AND 72 AND status = 'encerrado';
  v_fase_grupos_completa := (v_jogos_encerrados = 72);

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    FOR r IN SELECT posicao, team_id FROM public.get_classificacao_grupo(v_grupo) WHERE posicao <= 3
    LOOP
      IF r.posicao = 1 THEN v_top1 := v_top1 || jsonb_build_object(v_grupo, r.team_id);
      ELSIF r.posicao = 2 THEN v_top2 := v_top2 || jsonb_build_object(v_grupo, r.team_id);
      ELSE v_top3 := v_top3 || jsonb_build_object(v_grupo, r.team_id);
      END IF;
    END LOOP;
  END LOOP;

  SELECT array_agg(grupo ORDER BY grupo) INTO v_grupos_qualif
  FROM public.get_classificacao_terceiros() WHERE classificado_r32 = true;

  -- Deterministic
  PERFORM public._aplicar_alocacao_r32(73, (v_top2->>'A')::uuid, (v_top2->>'B')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(75, (v_top1->>'F')::uuid, (v_top2->>'C')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(76, (v_top1->>'C')::uuid, (v_top2->>'F')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(78, (v_top2->>'E')::uuid, (v_top2->>'I')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(83, (v_top2->>'K')::uuid, (v_top2->>'L')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(84, (v_top1->>'H')::uuid, (v_top2->>'J')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(86, (v_top1->>'J')::uuid, (v_top2->>'H')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
  PERFORM public._aplicar_alocacao_r32(88, (v_top2->>'D')::uuid, (v_top2->>'G')::uuid, v_fase_grupos_completa, p_force_admin_override_reset);

  -- Annexe C
  IF v_grupos_qualif IS NOT NULL AND array_length(v_grupos_qualif, 1) = 8 THEN
    SELECT * INTO v_combo
    FROM public.r32_terceiros_combinations
    WHERE grupos_qualificados = v_grupos_qualif
    LIMIT 1;

    IF v_combo.id IS NOT NULL THEN
      PERFORM public._aplicar_alocacao_r32(74, (v_top1->>'E')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1e FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(77, (v_top1->>'I')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1i FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(79, (v_top1->>'A')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1a FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(80, (v_top1->>'L')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1l FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(81, (v_top1->>'D')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1d FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(82, (v_top1->>'G')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1g FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(85, (v_top1->>'B')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1b FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
      PERFORM public._aplicar_alocacao_r32(87, (v_top1->>'K')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1k FROM 2 FOR 1))::uuid, v_fase_grupos_completa, p_force_admin_override_reset);
    END IF;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE alocacao_admin_override = false),
    COUNT(*) FILTER (WHERE alocacao_admin_override = true)
  INTO v_atualizados, v_protegidos
  FROM matches WHERE numero_jogo BETWEEN 73 AND 88;

  RETURN jsonb_build_object(
    'fase_grupos_completa', v_fase_grupos_completa,
    'jogos_grupo_encerrados', v_jogos_encerrados,
    'grupos_qualificados_terceiros', v_grupos_qualif,
    'jogos_atualizados', v_atualizados,
    'jogos_protegidos_por_admin', v_protegidos
  );
END;
$function$;

-- ============================================================
-- Parte 7: trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_resolve_r32_on_group_match_end()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.numero_jogo BETWEEN 1 AND 72
     AND NEW.status = 'encerrado'
     AND COALESCE(OLD.status, '') <> 'encerrado' THEN
    BEGIN
      PERFORM public.resolve_mata_mata_round_of_32();
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'resolve_r32 falhou: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_resolve_r32_after_group_match_end ON public.matches;
CREATE TRIGGER trg_resolve_r32_after_group_match_end
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_resolve_r32_on_group_match_end();

-- ============================================================
-- RPCs admin: override manual
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_r32_override(
  p_match_id uuid, p_home_id uuid, p_away_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas admin'; END IF;
  UPDATE public.matches
  SET team_home_id = p_home_id,
      team_away_id = p_away_id,
      alocacao_admin_override = true,
      alocacao_provisoria = false
  WHERE id = p_match_id;
  INSERT INTO public.audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'admin_r32_override_set', 'match', p_match_id::text,
          jsonb_build_object('home', p_home_id, 'away', p_away_id));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_clear_r32_override(p_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas admin'; END IF;
  UPDATE public.matches SET alocacao_admin_override = false WHERE id = p_match_id;
  INSERT INTO public.audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'admin_r32_override_clear', 'match', p_match_id::text, '{}'::jsonb);
  PERFORM public.resolve_mata_mata_round_of_32();
  RETURN jsonb_build_object('ok', true);
END;
$function$;
