
-- Fix get_ranking_geral: use correct status 'ativa'
CREATE OR REPLACE FUNCTION public.get_ranking_geral()
 RETURNS TABLE(quota_id uuid, user_id uuid, numero integer, pontos integer, exatos bigint, resultados bigint, nome text, apelido text, cor text, posicao bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      q.id AS quota_id, q.user_id, q.numero, q.pontos,
      p.nome, p.apelido, p.cor,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora), 0) AS exatos,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora) AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora)), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    WHERE q.status = 'ativa' AND COALESCE(p.role, 'pereba') <> 'sistema'
  )
  SELECT quota_id, user_id, numero, COALESCE(pontos, 0) AS pontos, exatos, resultados, nome, apelido, cor,
    ROW_NUMBER() OVER (ORDER BY COALESCE(pontos,0) DESC, exatos DESC, resultados DESC, apelido ASC) AS posicao
  FROM base;
$function$;

CREATE OR REPLACE FUNCTION public.get_ranking_diario(data_referencia date DEFAULT CURRENT_DATE)
 RETURNS TABLE(quota_id uuid, user_id uuid, numero integer, pontos bigint, exatos bigint, resultados bigint, nome text, apelido text, cor text, posicao bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT q.id AS quota_id, q.user_id, q.numero, p.nome, p.apelido, p.cor,
      COALESCE(SUM(pr.pontos_calculados), 0) AS pontos,
      COALESCE(SUM(CASE WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 1 ELSE 0 END), 0) AS exatos,
      COALESCE(SUM(CASE WHEN sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora) AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora) THEN 1 ELSE 0 END), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    LEFT JOIN public.predictions pr ON pr.quota_id = q.id
    LEFT JOIN public.matches m ON m.id = pr.match_id AND m.status = 'encerrado' AND (m.data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = data_referencia
    WHERE q.status = 'ativa' AND COALESCE(p.role, 'pereba') <> 'sistema'
    GROUP BY q.id, q.user_id, q.numero, p.nome, p.apelido, p.cor
  )
  SELECT quota_id, user_id, numero, pontos, exatos, resultados, nome, apelido, cor,
    ROW_NUMBER() OVER (ORDER BY pontos DESC, exatos DESC, resultados DESC, apelido ASC) AS posicao
  FROM base;
$function$;

CREATE OR REPLACE FUNCTION public.get_palpites_publicos_jogos(p_user_id uuid)
 RETURNS TABLE(match_id uuid, quota_numero integer, fase text, numero_jogo smallint, data_jogo timestamp with time zone, team_home_id uuid, team_away_id uuid, slot_casa text, slot_visitante text, casa text, fora text, status text, placar_casa_real integer, placar_fora_real integer, placar_casa_palpite integer, placar_fora_palpite integer, pontos integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.id, q.numero, m.fase, m.numero_jogo, m.data_jogo, m.team_home_id, m.team_away_id, m.slot_casa, m.slot_visitante, m.casa, m.fora, m.status, m.placar_casa, m.placar_fora, pr.placar_casa, pr.placar_fora, pr.pontos_calculados
  FROM public.predictions pr
  JOIN public.quotas q ON q.id = pr.quota_id AND q.user_id = p_user_id AND q.status = 'ativa'
  JOIN public.matches m ON m.id = pr.match_id
  WHERE m.travado_em IS NOT NULL AND m.travado_em <= now()
  ORDER BY m.data_jogo ASC, q.numero ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_palpites_publicos_top4(p_user_id uuid)
 RETURNS TABLE(quota_numero integer, posicao_1 text, posicao_2 text, posicao_3 text, posicao_4 text, alterado_em timestamp with time zone, fase_alteracao text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT q.numero, t.posicao_1, t.posicao_2, t.posicao_3, t.posicao_4, t.alterado_em, t.fase_alteracao
  FROM public.top4_predictions t
  JOIN public.quotas q ON q.id = t.quota_id AND q.user_id = p_user_id AND q.status = 'ativa'
  WHERE public.fase_atual_copa() IN ('round_32','oitavas','quartas','semis','final')
  ORDER BY q.numero ASC;
$function$;

-- Migrate legacy 3-letter codes in top4_predictions to bracket_position
DO $$
DECLARE
  mapping jsonb := '{
    "BRA":"GC1","ARG":"GJ1","FRA":"GI1","ESP":null,"ALE":"GE1","ING":null,
    "POR":null,"EUA":null,"MEX":null,"CAN":null,"URU":null,"HOL":null
  }';
  rec record;
  k text;
  v text;
BEGIN
  FOR k, v IN SELECT * FROM jsonb_each_text(mapping) LOOP
    IF v IS NULL THEN
      SELECT bracket_position INTO v FROM public.teams WHERE
        (k='ESP' AND nome_pt='Espanha') OR (k='ING' AND nome_pt='Inglaterra')
        OR (k='POR' AND nome_pt='Portugal') OR (k='EUA' AND nome_pt='Estados Unidos')
        OR (k='MEX' AND nome_pt='México') OR (k='CAN' AND nome_pt='Canadá')
        OR (k='URU' AND nome_pt='Uruguai') OR (k='HOL' AND nome_pt='Holanda')
        LIMIT 1;
    END IF;
    IF v IS NOT NULL THEN
      UPDATE public.top4_predictions SET posicao_1 = v WHERE posicao_1 = k;
      UPDATE public.top4_predictions SET posicao_2 = v WHERE posicao_2 = k;
      UPDATE public.top4_predictions SET posicao_3 = v WHERE posicao_3 = k;
      UPDATE public.top4_predictions SET posicao_4 = v WHERE posicao_4 = k;
    END IF;
  END LOOP;
END $$;
