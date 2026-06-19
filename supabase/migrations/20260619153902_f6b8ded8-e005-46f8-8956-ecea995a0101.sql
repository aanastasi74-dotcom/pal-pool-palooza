
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_origem text,
  ADD COLUMN IF NOT EXISTS away_origem text;

CREATE OR REPLACE FUNCTION public._aplicar_alocacao_r32(
  p_numero_jogo integer,
  p_home uuid,
  p_away uuid,
  p_fase_completa boolean,
  p_force_reset boolean,
  p_home_origem text DEFAULT NULL,
  p_away_origem text DEFAULT NULL
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
      home_origem = p_home_origem,
      away_origem = p_away_origem,
      alocacao_provisoria = NOT p_fase_completa,
      alocacao_admin_override = CASE WHEN p_force_reset THEN false ELSE alocacao_admin_override END
  WHERE numero_jogo = p_numero_jogo
    AND (p_force_reset OR alocacao_admin_override = false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_mata_mata_round_of_32(p_force_admin_override_reset boolean DEFAULT false)
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
  v_force_reset boolean;
  r record;
BEGIN
  SELECT COUNT(*) INTO v_jogos_encerrados
  FROM matches WHERE numero_jogo BETWEEN 1 AND 72 AND status = 'encerrado';
  v_fase_grupos_completa := (v_jogos_encerrados = 72);

  -- Group stage in progress: always overwrite + reset admin overrides.
  -- After group stage: respect existing overrides unless caller forces a reset.
  v_force_reset := (NOT v_fase_grupos_completa) OR p_force_admin_override_reset;

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

  -- Deterministic pairings (Article 12.6)
  PERFORM public._aplicar_alocacao_r32(73, (v_top2->>'A')::uuid, (v_top2->>'B')::uuid, v_fase_grupos_completa, v_force_reset, '2A', '2B');
  PERFORM public._aplicar_alocacao_r32(75, (v_top1->>'F')::uuid, (v_top2->>'C')::uuid, v_fase_grupos_completa, v_force_reset, '1F', '2C');
  PERFORM public._aplicar_alocacao_r32(76, (v_top1->>'C')::uuid, (v_top2->>'F')::uuid, v_fase_grupos_completa, v_force_reset, '1C', '2F');
  PERFORM public._aplicar_alocacao_r32(78, (v_top2->>'E')::uuid, (v_top2->>'I')::uuid, v_fase_grupos_completa, v_force_reset, '2E', '2I');
  PERFORM public._aplicar_alocacao_r32(83, (v_top2->>'K')::uuid, (v_top2->>'L')::uuid, v_fase_grupos_completa, v_force_reset, '2K', '2L');
  PERFORM public._aplicar_alocacao_r32(84, (v_top1->>'H')::uuid, (v_top2->>'J')::uuid, v_fase_grupos_completa, v_force_reset, '1H', '2J');
  PERFORM public._aplicar_alocacao_r32(86, (v_top1->>'J')::uuid, (v_top2->>'H')::uuid, v_fase_grupos_completa, v_force_reset, '1J', '2H');
  PERFORM public._aplicar_alocacao_r32(88, (v_top2->>'D')::uuid, (v_top2->>'G')::uuid, v_fase_grupos_completa, v_force_reset, '2D', '2G');

  IF v_grupos_qualif IS NOT NULL AND array_length(v_grupos_qualif, 1) = 8 THEN
    SELECT * INTO v_combo
    FROM public.r32_terceiros_combinations
    WHERE grupos_qualificados = v_grupos_qualif
    LIMIT 1;

    IF v_combo.id IS NOT NULL THEN
      PERFORM public._aplicar_alocacao_r32(74, (v_top1->>'E')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1e FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1E', v_combo.vs_1e);
      PERFORM public._aplicar_alocacao_r32(77, (v_top1->>'I')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1i FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1I', v_combo.vs_1i);
      PERFORM public._aplicar_alocacao_r32(79, (v_top1->>'A')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1a FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1A', v_combo.vs_1a);
      PERFORM public._aplicar_alocacao_r32(80, (v_top1->>'L')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1l FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1L', v_combo.vs_1l);
      PERFORM public._aplicar_alocacao_r32(81, (v_top1->>'D')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1d FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1D', v_combo.vs_1d);
      PERFORM public._aplicar_alocacao_r32(82, (v_top1->>'G')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1g FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1G', v_combo.vs_1g);
      PERFORM public._aplicar_alocacao_r32(85, (v_top1->>'B')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1b FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1B', v_combo.vs_1b);
      PERFORM public._aplicar_alocacao_r32(87, (v_top1->>'K')::uuid, (v_top3->>SUBSTRING(v_combo.vs_1k FROM 2 FOR 1))::uuid, v_fase_grupos_completa, v_force_reset, '1K', v_combo.vs_1k);
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

SELECT public.resolve_mata_mata_round_of_32();
