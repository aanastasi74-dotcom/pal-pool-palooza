
CREATE OR REPLACE FUNCTION public.pode_comprar_quota(
  p_user_id uuid,
  p_quantidade smallint DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_global int; total_pereba int; limite_pereba int; resta_global int; resta_pereba int;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RETURN jsonb_build_object('pode', false, 'motivo', 'Quantidade deve ser >= 1.');
  END IF;
  IF p_quantidade > 10 THEN
    RETURN jsonb_build_object('pode', false, 'motivo', 'Máximo 10 quotas por compra.');
  END IF;

  SELECT count(*) INTO total_global FROM quotas
    WHERE status IN ('ativa','aguardando_aprovacao');
  resta_global := public.limite_quotas_global_hard() - total_global;
  IF p_quantidade > resta_global THEN
    RETURN jsonb_build_object('pode', false,
      'motivo', format('Restam apenas %s vagas no bolão. Você pediu %s.', resta_global, p_quantidade),
      'restantes_global', resta_global);
  END IF;

  SELECT count(*) INTO total_pereba FROM quotas
    WHERE user_id = p_user_id AND status IN ('ativa','aguardando_aprovacao');
  limite_pereba := public.limite_quotas_pereba(p_user_id);
  resta_pereba := limite_pereba - total_pereba;

  IF p_quantidade > resta_pereba THEN
    RETURN jsonb_build_object('pode', false,
      'motivo', format('Limite individual de %s quotas (você já tem %s). Pode pedir até %s.',
                        limite_pereba, total_pereba, resta_pereba),
      'restantes_individual', resta_pereba);
  END IF;

  RETURN jsonb_build_object('pode', true,
    'restantes_individual', resta_pereba,
    'restantes_global', resta_global,
    'quantidade_solicitada', p_quantidade);
END;
$$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes_compra(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_lote_id ON public.payments(lote_id);
