
-- H.2.1 — recompute_peso_jogos com override Final
CREATE OR REPLACE FUNCTION public.recompute_peso_jogos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH dias AS (
    SELECT DISTINCT DATE(data_jogo AT TIME ZONE 'America/Sao_Paulo') AS d,
           DENSE_RANK() OVER (ORDER BY DATE(data_jogo AT TIME ZONE 'America/Sao_Paulo')) AS num
    FROM public.matches
    WHERE data_jogo IS NOT NULL
  )
  UPDATE public.matches m
  SET peso = 9 + dias.num
  FROM dias
  WHERE DATE(m.data_jogo AT TIME ZONE 'America/Sao_Paulo') = dias.d;

  UPDATE public.matches SET peso = 50 WHERE numero_jogo = 104;
END;
$$;

SELECT public.recompute_peso_jogos();

-- H.2.5 — Quotas: motivo_rejeicao, tentativas_comprovante, status encerrada
ALTER TABLE public.quotas
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

ALTER TABLE public.quotas
  ADD COLUMN IF NOT EXISTS tentativas_comprovante smallint NOT NULL DEFAULT 0;

ALTER TABLE public.quotas DROP CONSTRAINT IF EXISTS quotas_status_check;
ALTER TABLE public.quotas
  ADD CONSTRAINT quotas_status_check
  CHECK (status IN ('incompleta','aguardando_aprovacao','ativa',
                    'rejeitada','expirada','encerrada'));

-- H.2.6 — Lotes de compra
CREATE TABLE IF NOT EXISTS public.lotes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quantidade_pedida smallint NOT NULL CHECK (quantidade_pedida BETWEEN 1 AND 10),
  valor_esperado numeric(10,2) NOT NULL,
  comprovante_url text,
  tentativas_comprovante smallint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'incompleta'
    CHECK (status IN ('incompleta','aguardando_aprovacao','aprovado_total',
                      'aprovado_parcial','rejeitado','encerrado')),
  motivo_rejeicao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz
);

ALTER TABLE public.quotas
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes_compra(id);

ALTER TABLE public.lotes_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lotes_select_own ON public.lotes_compra;
CREATE POLICY lotes_select_own ON public.lotes_compra
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS lotes_insert_own ON public.lotes_compra;
CREATE POLICY lotes_insert_own ON public.lotes_compra
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS lotes_update_own_or_admin ON public.lotes_compra;
CREATE POLICY lotes_update_own_or_admin ON public.lotes_compra
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS lotes_delete_admin ON public.lotes_compra;
CREATE POLICY lotes_delete_admin ON public.lotes_compra
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- H.2.8 — pix_config em settings
INSERT INTO public.settings (key, value)
VALUES ('pix_config', jsonb_build_object(
  'chave', 'PLACEHOLDER-CHAVE-PIX',
  'beneficiario', 'BOLAO PEREBAS',
  'cidade', 'SAO PAULO'
))
ON CONFLICT (key) DO NOTHING;
