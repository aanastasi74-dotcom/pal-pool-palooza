CREATE OR REPLACE FUNCTION public.resolve_mata_mata_pos_r32(
  p_match_id_origem uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jogos_atualizados int := 0;
  v_jogos_protegidos_admin int := 0;
  v_log jsonb := '[]'::jsonb;
  r record;
BEGIN
  FOR r IN (
    SELECT m.id, m.numero_jogo, m.status
    FROM matches m
    WHERE m.numero_jogo BETWEEN 73 AND 102
      AND m.status = 'encerrado'
      AND (p_match_id_origem IS NULL OR m.id = p_match_id_origem)
    ORDER BY m.numero_jogo
  ) LOOP
    DECLARE
      v_vencedor_id uuid;
      v_perdedor_id uuid;
      v_codigo_v text := 'V' || r.numero_jogo;
      v_codigo_p text := 'P' || r.numero_jogo;
      v_jogos_destino_v int := 0;
      v_jogos_destino_p int := 0;
      v_protegidos int := 0;
    BEGIN
      v_vencedor_id := public.vencedor_real(r.id);
      IF v_vencedor_id IS NULL THEN
        v_log := v_log || jsonb_build_object(
          'jogo_origem', r.numero_jogo,
          'erro', 'vencedor_real retornou NULL — pulando'
        );
        CONTINUE;
      END IF;

      SELECT CASE 
        WHEN m.team_home_id = v_vencedor_id THEN m.team_away_id
        ELSE m.team_home_id
      END
      INTO v_perdedor_id
      FROM matches m WHERE m.id = r.id;

      WITH atualizados_home_v AS (
        UPDATE matches m_destino
        SET team_home_id = v_vencedor_id
        WHERE m_destino.numero_jogo BETWEEN 89 AND 104
          AND m_destino.home_origem = v_codigo_v
          AND m_destino.alocacao_admin_override = false
        RETURNING m_destino.id
      ),
      atualizados_away_v AS (
        UPDATE matches m_destino
        SET team_away_id = v_vencedor_id
        WHERE m_destino.numero_jogo BETWEEN 89 AND 104
          AND m_destino.away_origem = v_codigo_v
          AND m_destino.alocacao_admin_override = false
        RETURNING m_destino.id
      )
      SELECT COUNT(*) INTO v_jogos_destino_v
      FROM (
        SELECT id FROM atualizados_home_v
        UNION ALL
        SELECT id FROM atualizados_away_v
      ) x;

      v_jogos_atualizados := v_jogos_atualizados + v_jogos_destino_v;

      WITH atualizados_home_p AS (
        UPDATE matches m_destino
        SET team_home_id = v_perdedor_id
        WHERE m_destino.numero_jogo BETWEEN 89 AND 104
          AND m_destino.home_origem = v_codigo_p
          AND m_destino.alocacao_admin_override = false
        RETURNING m_destino.id
      ),
      atualizados_away_p AS (
        UPDATE matches m_destino
        SET team_away_id = v_perdedor_id
        WHERE m_destino.numero_jogo BETWEEN 89 AND 104
          AND m_destino.away_origem = v_codigo_p
          AND m_destino.alocacao_admin_override = false
        RETURNING m_destino.id
      )
      SELECT COUNT(*) INTO v_jogos_destino_p
      FROM (
        SELECT id FROM atualizados_home_p
        UNION ALL
        SELECT id FROM atualizados_away_p
      ) x;

      v_jogos_atualizados := v_jogos_atualizados + v_jogos_destino_p;

      SELECT COUNT(*) INTO v_protegidos
      FROM matches m_destino
      WHERE m_destino.numero_jogo BETWEEN 89 AND 104
        AND m_destino.alocacao_admin_override = true
        AND (m_destino.home_origem IN (v_codigo_v, v_codigo_p) 
             OR m_destino.away_origem IN (v_codigo_v, v_codigo_p));

      v_jogos_protegidos_admin := v_jogos_protegidos_admin + v_protegidos;

      v_log := v_log || jsonb_build_object(
        'jogo_origem', r.numero_jogo,
        'vencedor_id', v_vencedor_id,
        'perdedor_id', v_perdedor_id,
        'jogos_destino_v', v_jogos_destino_v,
        'jogos_destino_p', v_jogos_destino_p,
        'protegidos_admin', v_protegidos
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'jogos_atualizados', v_jogos_atualizados,
    'jogos_protegidos_admin', v_jogos_protegidos_admin,
    'log', v_log
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_resolve_pos_r32_on_match_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.numero_jogo BETWEEN 73 AND 102
     AND NEW.status = 'encerrado'
     AND COALESCE(OLD.status, '') <> 'encerrado' THEN
    PERFORM public.resolve_mata_mata_pos_r32(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_resolve_pos_r32_after_match_end ON public.matches;
CREATE TRIGGER trg_resolve_pos_r32_after_match_end
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_resolve_pos_r32_on_match_end();