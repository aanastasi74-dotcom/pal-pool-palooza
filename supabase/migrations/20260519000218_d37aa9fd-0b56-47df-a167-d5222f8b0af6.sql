-- Backup
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.settings_pre_k7 AS SELECT * FROM public.settings;

-- Tabela das 7 faixas
CREATE TABLE IF NOT EXISTS public.faixas_premiacao (
  id smallint PRIMARY KEY,
  nome text NOT NULL,
  quotas_min integer NOT NULL,
  quotas_max integer,
  pct_1 numeric(6,5) NOT NULL,
  pct_2 numeric(6,5) NOT NULL,
  pct_3 numeric(6,5) NOT NULL,
  pct_4 numeric(6,5) NOT NULL DEFAULT 0,
  pct_5 numeric(6,5) NOT NULL DEFAULT 0,
  pct_6_10_cada numeric(7,6) NOT NULL DEFAULT 0,
  pct_lant numeric(6,5) NOT NULL DEFAULT 0.05,
  devolucao_qts integer NOT NULL DEFAULT 0,
  devolucao_pos_de integer,
  devolucao_pos_ate integer,
  rotulo_faixa text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.faixas_premiacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faixas_select_all" ON public.faixas_premiacao FOR SELECT TO public USING (true);
CREATE POLICY "faixas_admin_all" ON public.faixas_premiacao FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.faixas_premiacao
  (id, nome, quotas_min, quotas_max, pct_1, pct_2, pct_3, pct_4, pct_5, pct_6_10_cada, pct_lant, devolucao_qts, devolucao_pos_de, devolucao_pos_ate, rotulo_faixa)
VALUES
  (1, 'F1', 1,    49,   0.60000, 0.25000, 0.10000, 0.00000, 0.00000, 0.000000, 0.05000, 0,  NULL, NULL, '≤ 49'),
  (2, 'F2', 50,   99,   0.59000, 0.24000, 0.10000, 0.02000, 0.00000, 0.000000, 0.05000, 0,  NULL, NULL, '50-99'),
  (3, 'F3', 100,  249,  0.57500, 0.23500, 0.10000, 0.02500, 0.01500, 0.000000, 0.05000, 0,  NULL, NULL, '100-249'),
  (4, 'F4', 250,  499,  0.55750, 0.23250, 0.10000, 0.02500, 0.01500, 0.000000, 0.05000, 5,  6,    10,   '250-499'),
  (5, 'F5', 500,  999,  0.55000, 0.23000, 0.10000, 0.02500, 0.01500, 0.002000, 0.05000, 10, 11,   20,   '500-999'),
  (6, 'F6', 1000, 1249, 0.52500, 0.22500, 0.10000, 0.04000, 0.02500, 0.003000, 0.05000, 20, 11,   30,   '1000-1249'),
  (7, 'F7', 1250, 1500, 0.50000, 0.22500, 0.10000, 0.05000, 0.03000, 0.002600, 0.05000, 40, 11,   50,   '1250-1500')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('premiacao_valor_quota', '50'::jsonb),
  ('premiacao_custos_fixos', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.calcular_premiacao(p_quotas_ativas integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faixa record;
  v_proxima record;
  v_valor_quota numeric;
  v_custos_fixos numeric;
  v_bruta numeric;
  v_liquida numeric;
  v_primeiro_base numeric;
  v_segundo numeric;
  v_terceiro numeric;
  v_quarto numeric;
  v_quinto numeric;
  v_sexto_decimo_cada numeric;
  v_sexto_decimo_total numeric;
  v_lant numeric;
  v_devolucao_total numeric;
  v_distribuido numeric;
  v_bonus_primeiro numeric;
  v_primeiro_total numeric;
BEGIN
  SELECT (value)::text::numeric INTO v_valor_quota FROM settings WHERE key = 'premiacao_valor_quota';
  SELECT (value)::text::numeric INTO v_custos_fixos FROM settings WHERE key = 'premiacao_custos_fixos';
  v_valor_quota := COALESCE(v_valor_quota, 50);
  v_custos_fixos := COALESCE(v_custos_fixos, 0);

  IF p_quotas_ativas IS NULL OR p_quotas_ativas < 1 THEN
    RETURN jsonb_build_object(
      'quotas_ativas', 0,
      'faixa', null,
      'bruta', 0,
      'liquida', 0,
      'premios', '{}'::jsonb
    );
  END IF;

  SELECT * INTO v_faixa FROM faixas_premiacao
  WHERE quotas_min <= p_quotas_ativas
    AND (quotas_max IS NULL OR quotas_max >= p_quotas_ativas)
  ORDER BY id ASC LIMIT 1;

  IF v_faixa IS NULL THEN
    SELECT * INTO v_faixa FROM faixas_premiacao ORDER BY id DESC LIMIT 1;
  END IF;

  SELECT * INTO v_proxima FROM faixas_premiacao WHERE id = v_faixa.id + 1;

  v_bruta := p_quotas_ativas * v_valor_quota;
  v_liquida := v_bruta - v_custos_fixos;

  v_primeiro_base := round(v_faixa.pct_1 * v_liquida, 2);
  v_segundo := round(v_faixa.pct_2 * v_liquida, 2);
  v_terceiro := round(v_faixa.pct_3 * v_liquida, 2);
  v_quarto := round(v_faixa.pct_4 * v_liquida, 2);
  v_quinto := round(v_faixa.pct_5 * v_liquida, 2);
  v_sexto_decimo_cada := round(v_faixa.pct_6_10_cada * v_liquida, 2);
  v_sexto_decimo_total := round(v_sexto_decimo_cada * 5, 2);
  v_lant := round(v_faixa.pct_lant * v_liquida, 2);
  v_devolucao_total := v_faixa.devolucao_qts * v_valor_quota;

  v_distribuido := v_primeiro_base + v_segundo + v_terceiro + v_quarto + v_quinto
                 + v_sexto_decimo_total + v_lant + v_devolucao_total;

  v_bonus_primeiro := round(v_liquida - v_distribuido, 2);
  IF v_bonus_primeiro < 0 THEN v_bonus_primeiro := 0; END IF;
  v_primeiro_total := v_primeiro_base + v_bonus_primeiro;

  RETURN jsonb_build_object(
    'quotas_ativas', p_quotas_ativas,
    'faixa', jsonb_build_object(
      'id', v_faixa.id,
      'nome', v_faixa.nome,
      'rotulo', v_faixa.rotulo_faixa,
      'quotas_min', v_faixa.quotas_min,
      'quotas_max', v_faixa.quotas_max
    ),
    'proxima_faixa', CASE WHEN v_proxima.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_proxima.id,
        'nome', v_proxima.nome,
        'rotulo', v_proxima.rotulo_faixa,
        'quotas_min', v_proxima.quotas_min,
        'quotas_para_alcancar', v_proxima.quotas_min - p_quotas_ativas
      )
    ELSE NULL END,
    'valor_quota', v_valor_quota,
    'custos_fixos', v_custos_fixos,
    'bruta', v_bruta,
    'liquida', v_liquida,
    'premios', jsonb_build_object(
      'primeiro_base', v_primeiro_base,
      'primeiro_bonus', v_bonus_primeiro,
      'primeiro_total', v_primeiro_total,
      'segundo', v_segundo,
      'terceiro', v_terceiro,
      'quarto', v_quarto,
      'quinto', v_quinto,
      'sexto_decimo_cada', v_sexto_decimo_cada,
      'sexto_decimo_total', v_sexto_decimo_total,
      'lanterninha', v_lant,
      'devolucao_total', v_devolucao_total,
      'devolucao_pos_de', v_faixa.devolucao_pos_de,
      'devolucao_pos_ate', v_faixa.devolucao_pos_ate,
      'devolucao_qts', v_faixa.devolucao_qts,
      'devolucao_por_pereba', v_valor_quota
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_premiacao(integer) TO authenticated, anon;