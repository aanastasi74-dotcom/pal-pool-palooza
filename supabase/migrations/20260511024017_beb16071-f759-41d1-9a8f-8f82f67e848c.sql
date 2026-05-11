
-- Ranking diário: pontos de jogos encerrados em uma data específica
CREATE OR REPLACE FUNCTION public.get_ranking_diario(data_referencia date DEFAULT CURRENT_DATE)
RETURNS TABLE(quota_id uuid, user_id uuid, numero integer, pontos bigint, exatos bigint, resultados bigint, nome text, apelido text, cor text, posicao bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      q.id AS quota_id,
      q.user_id,
      q.numero,
      p.nome,
      p.apelido,
      p.cor,
      COALESCE(SUM(pr.pontos_calculados), 0) AS pontos,
      COALESCE(SUM(CASE WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 1 ELSE 0 END), 0) AS exatos,
      COALESCE(SUM(CASE WHEN sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora)
                          AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora) THEN 1 ELSE 0 END), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    LEFT JOIN public.predictions pr ON pr.quota_id = q.id
    LEFT JOIN public.matches m ON m.id = pr.match_id
      AND m.status = 'encerrado'
      AND (m.data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = data_referencia
    WHERE q.status = 'aprovada'
      AND COALESCE(p.role, 'pereba') <> 'sistema'
    GROUP BY q.id, q.user_id, q.numero, p.nome, p.apelido, p.cor
  )
  SELECT
    quota_id, user_id, numero, pontos, exatos, resultados,
    nome, apelido, cor,
    ROW_NUMBER() OVER (ORDER BY pontos DESC, exatos DESC, resultados DESC, apelido ASC) AS posicao
  FROM base;
$$;

-- Palpites públicos (jogos travados) de um pereba específico
CREATE OR REPLACE FUNCTION public.get_palpites_publicos_jogos(p_user_id uuid)
RETURNS TABLE(
  match_id uuid,
  quota_numero integer,
  fase text,
  numero_jogo smallint,
  data_jogo timestamptz,
  team_home_id uuid,
  team_away_id uuid,
  slot_casa text,
  slot_visitante text,
  casa text,
  fora text,
  status text,
  placar_casa_real integer,
  placar_fora_real integer,
  placar_casa_palpite integer,
  placar_fora_palpite integer,
  pontos integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    m.id AS match_id,
    q.numero AS quota_numero,
    m.fase,
    m.numero_jogo,
    m.data_jogo,
    m.team_home_id,
    m.team_away_id,
    m.slot_casa,
    m.slot_visitante,
    m.casa,
    m.fora,
    m.status,
    m.placar_casa AS placar_casa_real,
    m.placar_fora AS placar_fora_real,
    pr.placar_casa AS placar_casa_palpite,
    pr.placar_fora AS placar_fora_palpite,
    pr.pontos_calculados AS pontos
  FROM public.predictions pr
  JOIN public.quotas q ON q.id = pr.quota_id AND q.user_id = p_user_id AND q.status = 'aprovada'
  JOIN public.matches m ON m.id = pr.match_id
  WHERE m.travado_em IS NOT NULL AND m.travado_em <= now()
  ORDER BY m.data_jogo ASC, q.numero ASC;
$$;

-- Top 4 público (apenas a partir de round_of_32/round_32)
CREATE OR REPLACE FUNCTION public.get_palpites_publicos_top4(p_user_id uuid)
RETURNS TABLE(
  quota_numero integer,
  posicao_1 text,
  posicao_2 text,
  posicao_3 text,
  posicao_4 text,
  alterado_em timestamptz,
  fase_alteracao text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT q.numero, t.posicao_1, t.posicao_2, t.posicao_3, t.posicao_4, t.alterado_em, t.fase_alteracao
  FROM public.top4_predictions t
  JOIN public.quotas q ON q.id = t.quota_id AND q.user_id = p_user_id AND q.status = 'aprovada'
  WHERE public.fase_atual_copa() IN ('round_32','oitavas','quartas','semis','final')
  ORDER BY q.numero ASC;
$$;

-- Verificar se um apelido está disponível (case-insensitive)
CREATE OR REPLACE FUNCTION public.check_apelido_disponivel(p_apelido text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE upper(apelido) = upper(p_apelido)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_diario(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_palpites_publicos_jogos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_palpites_publicos_top4(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_apelido_disponivel(text) TO anon, authenticated;
