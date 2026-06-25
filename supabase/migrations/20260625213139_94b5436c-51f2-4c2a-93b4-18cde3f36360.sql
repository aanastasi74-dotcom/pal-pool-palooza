CREATE TABLE IF NOT EXISTS public.historico_ranking_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_snapshot date NOT NULL,
  quota_id uuid NOT NULL REFERENCES public.quotas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  posicao integer NOT NULL,
  pontos integer NOT NULL,
  total_quotas_ativas integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historico_ranking_unico_por_dia UNIQUE (data_snapshot, quota_id)
);

GRANT SELECT ON public.historico_ranking_diario TO authenticated;
GRANT SELECT ON public.historico_ranking_diario TO anon;
GRANT ALL ON public.historico_ranking_diario TO service_role;

ALTER TABLE public.historico_ranking_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_ranking_select_authenticated"
ON public.historico_ranking_diario FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_historico_ranking_quota_data 
  ON public.historico_ranking_diario (quota_id, data_snapshot);

CREATE INDEX IF NOT EXISTS idx_historico_ranking_data 
  ON public.historico_ranking_diario (data_snapshot);

CREATE OR REPLACE FUNCTION public.snapshot_ranking_diario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_data_snapshot date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total_quotas_ativas integer;
  v_inseridos integer;
BEGIN
  SELECT COUNT(*) INTO v_total_quotas_ativas 
  FROM quotas WHERE status = 'ativa';

  INSERT INTO historico_ranking_diario (data_snapshot, quota_id, user_id, posicao, pontos, total_quotas_ativas)
  SELECT 
    v_data_snapshot,
    q.id,
    q.user_id,
    q.posicao,
    q.pontos,
    v_total_quotas_ativas
  FROM quotas q
  WHERE q.status = 'ativa'
    AND q.posicao IS NOT NULL
  ON CONFLICT (data_snapshot, quota_id) 
  DO UPDATE SET 
    posicao = EXCLUDED.posicao,
    pontos = EXCLUDED.pontos,
    total_quotas_ativas = EXCLUDED.total_quotas_ativas;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'data_snapshot', v_data_snapshot,
    'total_quotas_ativas', v_total_quotas_ativas,
    'linhas_processadas', v_inseridos
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_historico_ranking_quota(p_quota_id uuid)
RETURNS TABLE(
  data_snapshot date,
  posicao integer,
  pontos integer,
  total_quotas_ativas integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    data_snapshot,
    posicao,
    pontos,
    total_quotas_ativas
  FROM historico_ranking_diario
  WHERE quota_id = p_quota_id
  ORDER BY data_snapshot ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_historico_ranking_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historico_ranking_quota(uuid) TO anon;