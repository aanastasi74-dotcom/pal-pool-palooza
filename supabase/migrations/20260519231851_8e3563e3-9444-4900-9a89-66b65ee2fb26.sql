CREATE OR REPLACE FUNCTION public.get_estatisticas_palpites(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_total_quotas_ativas integer;
  v_total_palpites integer;
  v_placar_mais_apostado record;
  v_pct_vitoria_casa numeric;
  v_pct_empate numeric;
  v_pct_vitoria_fora numeric;
  v_maior_diferenca record;
  v_palpite_do_louco record;
  v_resultado jsonb;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF v_match IS NULL THEN
    RETURN jsonb_build_object('error', 'Jogo não encontrado');
  END IF;

  IF v_match.travado_em IS NULL OR v_match.travado_em > now() THEN
    RETURN jsonb_build_object('disponivel', false, 'motivo', 'Jogo ainda não travou');
  END IF;

  SELECT count(*) INTO v_total_quotas_ativas FROM quotas WHERE status = 'ativa';

  SELECT count(*) INTO v_total_palpites
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa IS NOT NULL
    AND pr.placar_fora IS NOT NULL
    AND q.status = 'ativa';

  IF v_total_palpites < 10 THEN
    RETURN jsonb_build_object(
      'disponivel', true,
      'quorum_atingido', false,
      'total_palpites', v_total_palpites,
      'total_quotas_ativas', v_total_quotas_ativas,
      'motivo_sem_stats', 'Estatísticas detalhadas aparecem com 10+ palpites'
    );
  END IF;

  SELECT pr.placar_casa AS pc, pr.placar_fora AS pf, count(*) AS qtd
  INTO v_placar_mais_apostado
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa IS NOT NULL
    AND pr.placar_fora IS NOT NULL
    AND q.status = 'ativa'
  GROUP BY pr.placar_casa, pr.placar_fora
  ORDER BY count(*) DESC, pr.placar_casa ASC, pr.placar_fora ASC
  LIMIT 1;

  SELECT
    round(100.0 * count(*) FILTER (WHERE pr.placar_casa > pr.placar_fora) / NULLIF(v_total_palpites, 0), 1),
    round(100.0 * count(*) FILTER (WHERE pr.placar_casa = pr.placar_fora) / NULLIF(v_total_palpites, 0), 1),
    round(100.0 * count(*) FILTER (WHERE pr.placar_casa < pr.placar_fora) / NULLIF(v_total_palpites, 0), 1)
  INTO v_pct_vitoria_casa, v_pct_empate, v_pct_vitoria_fora
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa IS NOT NULL
    AND pr.placar_fora IS NOT NULL
    AND q.status = 'ativa';

  SELECT pr.placar_casa AS pc, pr.placar_fora AS pf, abs(pr.placar_casa - pr.placar_fora) AS diferenca,
         p.apelido, q.numero AS quota_numero
  INTO v_maior_diferenca
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  JOIN profiles p ON p.id = q.user_id
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa IS NOT NULL
    AND pr.placar_fora IS NOT NULL
    AND q.status = 'ativa'
  ORDER BY abs(pr.placar_casa - pr.placar_fora) DESC, (pr.placar_casa + pr.placar_fora) DESC
  LIMIT 1;

  WITH stats_medias AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY pr.placar_casa) AS mediana_casa,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY pr.placar_fora) AS mediana_fora
    FROM predictions pr
    JOIN quotas q ON q.id = pr.quota_id
    WHERE pr.match_id = p_match_id
      AND pr.placar_casa IS NOT NULL
      AND pr.placar_fora IS NOT NULL
      AND q.status = 'ativa'
  )
  SELECT pr.placar_casa AS pc, pr.placar_fora AS pf,
         sqrt(power(pr.placar_casa - sm.mediana_casa, 2) + power(pr.placar_fora - sm.mediana_fora, 2)) AS distancia,
         p.apelido, q.numero AS quota_numero
  INTO v_palpite_do_louco
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  JOIN profiles p ON p.id = q.user_id
  CROSS JOIN stats_medias sm
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa IS NOT NULL
    AND pr.placar_fora IS NOT NULL
    AND q.status = 'ativa'
  ORDER BY sqrt(power(pr.placar_casa - sm.mediana_casa, 2) + power(pr.placar_fora - sm.mediana_fora, 2)) DESC
  LIMIT 1;

  v_resultado := jsonb_build_object(
    'disponivel', true,
    'quorum_atingido', true,
    'total_palpites', v_total_palpites,
    'total_quotas_ativas', v_total_quotas_ativas,
    'placar_mais_apostado', jsonb_build_object(
      'casa', v_placar_mais_apostado.pc,
      'fora', v_placar_mais_apostado.pf,
      'qtd', v_placar_mais_apostado.qtd
    ),
    'percentuais', jsonb_build_object(
      'vitoria_casa', v_pct_vitoria_casa,
      'empate', v_pct_empate,
      'vitoria_fora', v_pct_vitoria_fora
    ),
    'maior_diferenca', jsonb_build_object(
      'casa', v_maior_diferenca.pc,
      'fora', v_maior_diferenca.pf,
      'diferenca', v_maior_diferenca.diferenca,
      'apelido', v_maior_diferenca.apelido,
      'quota_numero', v_maior_diferenca.quota_numero
    ),
    'palpite_do_louco', jsonb_build_object(
      'casa', v_palpite_do_louco.pc,
      'fora', v_palpite_do_louco.pf,
      'apelido', v_palpite_do_louco.apelido,
      'quota_numero', v_palpite_do_louco.quota_numero
    )
  );

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_estatisticas_palpites(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_so_voce_achou(p_match_id uuid, p_quota_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_total_quotas_ativas integer;
  v_meu_palpite record;
  v_qtd_mesmo_palpite integer;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF v_match IS NULL OR v_match.travado_em IS NULL OR v_match.travado_em > now() THEN
    RETURN jsonb_build_object('aplicavel', false);
  END IF;

  SELECT count(*) INTO v_total_quotas_ativas FROM quotas WHERE status = 'ativa';
  IF v_total_quotas_ativas < 50 THEN
    RETURN jsonb_build_object('aplicavel', false, 'motivo', 'Bolão pequeno (< 50 quotas)');
  END IF;

  SELECT placar_casa AS pc, placar_fora AS pf INTO v_meu_palpite
  FROM predictions
  WHERE match_id = p_match_id AND quota_id = p_quota_id
    AND placar_casa IS NOT NULL AND placar_fora IS NOT NULL;

  IF v_meu_palpite IS NULL THEN
    RETURN jsonb_build_object('aplicavel', false, 'motivo', 'Sem palpite nesta quota');
  END IF;

  SELECT count(*) INTO v_qtd_mesmo_palpite
  FROM predictions pr
  JOIN quotas q ON q.id = pr.quota_id
  WHERE pr.match_id = p_match_id
    AND pr.placar_casa = v_meu_palpite.pc
    AND pr.placar_fora = v_meu_palpite.pf
    AND q.status = 'ativa';

  RETURN jsonb_build_object(
    'aplicavel', v_qtd_mesmo_palpite = 1,
    'palpite_casa', v_meu_palpite.pc,
    'palpite_fora', v_meu_palpite.pf,
    'qtd_quotas_mesmo_palpite', v_qtd_mesmo_palpite
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_so_voce_achou(uuid, uuid) TO authenticated;