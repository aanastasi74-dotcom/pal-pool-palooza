DROP FUNCTION IF EXISTS public.get_profile_public(uuid);
DROP FUNCTION IF EXISTS public.get_ranking_geral();
DROP FUNCTION IF EXISTS public.get_ranking_diario(date);

CREATE OR REPLACE FUNCTION public.get_profile_public(p_user_id uuid)
 RETURNS TABLE(id uuid, nome text, apelido text, cor text, sigla text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, nome, apelido, cor, sigla FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_ranking_geral()
 RETURNS TABLE(quota_id uuid, user_id uuid, numero integer, pontos integer, exatos bigint, resultados bigint, nome text, apelido text, cor text, sigla text, posicao bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      q.id AS quota_id, q.user_id, q.numero, q.pontos,
      p.nome, p.apelido, p.cor, p.sigla,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora), 0) AS exatos,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora) AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora)), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    WHERE q.status = 'ativa' AND COALESCE(p.role, 'pereba') <> 'sistema'
  )
  SELECT quota_id, user_id, numero, COALESCE(pontos, 0) AS pontos, exatos, resultados, nome, apelido, cor, sigla,
    ROW_NUMBER() OVER (ORDER BY COALESCE(pontos,0) DESC, exatos DESC, resultados DESC, apelido ASC) AS posicao
  FROM base;
$$;

CREATE OR REPLACE FUNCTION public.get_ranking_diario(data_referencia date DEFAULT CURRENT_DATE)
 RETURNS TABLE(quota_id uuid, user_id uuid, numero integer, pontos bigint, exatos bigint, resultados bigint, nome text, apelido text, cor text, sigla text, posicao bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT q.id AS quota_id, q.user_id, q.numero, p.nome, p.apelido, p.cor, p.sigla,
      COALESCE(SUM(pr.pontos_calculados), 0) AS pontos,
      COALESCE(SUM(CASE WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 1 ELSE 0 END), 0) AS exatos,
      COALESCE(SUM(CASE WHEN sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora) AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora) THEN 1 ELSE 0 END), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    LEFT JOIN public.predictions pr ON pr.quota_id = q.id
    LEFT JOIN public.matches m ON m.id = pr.match_id AND m.status = 'encerrado' AND (m.data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = data_referencia
    WHERE q.status = 'ativa' AND COALESCE(p.role, 'pereba') <> 'sistema'
    GROUP BY q.id, q.user_id, q.numero, p.nome, p.apelido, p.cor, p.sigla
  )
  SELECT quota_id, user_id, numero, pontos, exatos, resultados, nome, apelido, cor, sigla,
    ROW_NUMBER() OVER (ORDER BY pontos DESC, exatos DESC, resultados DESC, apelido ASC) AS posicao
  FROM base;
$$;