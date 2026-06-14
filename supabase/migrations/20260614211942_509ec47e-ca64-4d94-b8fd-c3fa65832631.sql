
-- Backup
CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.quotas_pre_n19;
CREATE TABLE backups.quotas_pre_n19 AS TABLE public.quotas;

-- Coluna posicao_anterior
ALTER TABLE public.quotas ADD COLUMN IF NOT EXISTS posicao_anterior integer;

-- Atualiza get_ranking_geral: adiciona coluna variacao, preserva lógica/desempate N.2
DROP FUNCTION IF EXISTS public.get_ranking_geral();

CREATE FUNCTION public.get_ranking_geral()
RETURNS TABLE(
  quota_id uuid, user_id uuid, numero integer, pontos integer,
  exatos bigint, resultados bigint,
  nome text, apelido text, cor text, sigla text,
  posicao bigint,
  variacao integer
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      q.id AS quota_id, q.user_id, q.numero, q.pontos, q.created_at, q.posicao_anterior,
      p.nome, p.apelido, p.cor, p.sigla,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora), 0) AS exatos,
      COALESCE((SELECT COUNT(*) FROM public.predictions pr JOIN public.matches m ON m.id = pr.match_id WHERE pr.quota_id = q.id AND m.status = 'encerrado' AND sign(pr.placar_casa - pr.placar_fora) = sign(m.placar_casa - m.placar_fora) AND NOT (pr.placar_casa = m.placar_casa AND pr.placar_fora = m.placar_fora)), 0) AS resultados
    FROM public.quotas q
    JOIN public.profiles p ON p.id = q.user_id
    WHERE q.status = 'ativa' AND COALESCE(p.role, 'pereba') <> 'sistema'
  ),
  ranked AS (
    SELECT quota_id, user_id, numero, COALESCE(pontos, 0) AS pontos, exatos, resultados, nome, apelido, cor, sigla, posicao_anterior,
      ROW_NUMBER() OVER (ORDER BY COALESCE(pontos,0) DESC, exatos DESC, resultados DESC, created_at ASC) AS posicao
    FROM base
  )
  SELECT quota_id, user_id, numero, pontos, exatos, resultados, nome, apelido, cor, sigla, posicao,
    CASE WHEN posicao_anterior IS NULL THEN NULL
         ELSE (posicao_anterior - posicao)::integer
    END AS variacao
  FROM ranked;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ranking_geral() TO authenticated, anon, service_role;

-- Trigger de snapshot antes de encerrar um jogo
CREATE OR REPLACE FUNCTION public.snapshot_ranking_quotas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'encerrado' AND COALESCE(OLD.status, '') <> 'encerrado' THEN
    UPDATE public.quotas q
    SET posicao_anterior = r.posicao
    FROM (SELECT quota_id, posicao FROM public.get_ranking_geral()) r
    WHERE q.id = r.quota_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_snapshot_ranking_before_recalc ON public.matches;
CREATE TRIGGER trg_snapshot_ranking_before_recalc
BEFORE UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_ranking_quotas();
