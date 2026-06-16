DROP FUNCTION IF EXISTS public.get_palpites_jogo(uuid);

CREATE FUNCTION public.get_palpites_jogo(p_match_id uuid)
RETURNS TABLE(
  quota_id uuid,
  quota_numero integer,
  user_id uuid,
  apelido text,
  sigla text,
  cor text,
  placar_casa integer,
  placar_fora integer,
  pontos integer,
  posicao_ranking integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  -- N.21: pontos provisórios ao vivo. Durante status='ao-vivo' calcula
  -- on-the-fly usando placar atual. Quando encerrado, usa pontos_calculados
  -- oficial gravado pelo calcular-pontos.
  -- ATENÇÃO: fórmula abaixo deve ser idêntica à de
  -- supabase/functions/calcular-pontos/index.ts (§6/§7 do regulamento).
  WITH ranking_snapshot AS (
    SELECT quota_id, posicao FROM public.get_ranking_geral()
  )
  SELECT
    pr.quota_id,
    q.numero AS quota_numero,
    q.user_id,
    p.apelido,
    COALESCE(NULLIF(p.sigla, ''), UPPER(LEFT(p.apelido, 3))) AS sigla,
    p.cor,
    pr.placar_casa,
    pr.placar_fora,
    (CASE
       WHEN m.status = 'encerrado' THEN COALESCE(pr.pontos_calculados, 0)
       WHEN m.placar_casa IS NULL OR m.placar_fora IS NULL THEN 0
       WHEN SIGN(pr.placar_casa - pr.placar_fora) <> SIGN(m.placar_casa - m.placar_fora) THEN 0
       WHEN pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora THEN 12 * m.peso
       ELSE (
         4 +
         (CASE WHEN pr.placar_casa = m.placar_casa THEN 1 ELSE 0 END) +
         (CASE WHEN pr.placar_fora = m.placar_fora THEN 1 ELSE 0 END) +
         (CASE WHEN (pr.placar_casa - pr.placar_fora) = (m.placar_casa - m.placar_fora) THEN 2 ELSE 0 END)
       ) * m.peso
     END)::integer AS pontos,
    COALESCE(rs.posicao, 999)::integer AS posicao_ranking
  FROM public.matches m
  JOIN public.predictions pr ON pr.match_id = m.id
  JOIN public.quotas q ON q.id = pr.quota_id AND q.status = 'ativa'
  JOIN public.profiles p ON p.id = q.user_id
  LEFT JOIN ranking_snapshot rs ON rs.quota_id = pr.quota_id
  WHERE m.id = p_match_id
    AND m.travado_em IS NOT NULL
    AND m.travado_em <= now()
    AND COALESCE(p.role, 'pereba') <> 'sistema'
  ORDER BY p.apelido ASC, q.numero ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_palpites_jogo(uuid) TO authenticated, anon, service_role;

-- Realtime para reagir a mudanças no placar ao vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches' AND schemaname = 'public'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.matches';
  END IF;
END $$;