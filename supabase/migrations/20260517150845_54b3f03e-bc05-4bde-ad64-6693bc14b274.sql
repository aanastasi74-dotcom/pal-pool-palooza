CREATE OR REPLACE FUNCTION public.ativar_quota_manual(p_quota_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v record;
  v_numero integer;
  v_total integer;
  v_ativas integer;
  v_pendentes integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 10 caracteres)';
  END IF;
  SELECT * INTO v FROM quotas WHERE id = p_quota_id FOR UPDATE;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Quota não encontrada';
  END IF;

  IF v.numero IS NULL THEN
    v_numero := public.proximo_numero_quota(v.user_id);
    UPDATE quotas SET numero = v_numero WHERE id = p_quota_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM payments WHERE quota_id = p_quota_id AND status = 'aprovado') THEN
    IF EXISTS (SELECT 1 FROM payments WHERE quota_id = p_quota_id) THEN
      UPDATE payments
      SET status = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now(), motivo_rejeicao = NULL
      WHERE quota_id = p_quota_id;
    ELSE
      INSERT INTO payments (quota_id, user_id, valor, status, aprovado_por, aprovado_em, lote_id)
      VALUES (p_quota_id, v.user_id, 50.00, 'aprovado', auth.uid(), now(), v.lote_id);
    END IF;
  END IF;

  UPDATE quotas SET status = 'ativa', paga_em = COALESCE(paga_em, now()) WHERE id = p_quota_id;

  -- K.2: se a quota tem lote e todas as quotas do lote estão decididas, atualiza lote.status
  IF v.lote_id IS NOT NULL THEN
    SELECT
      count(*),
      count(*) FILTER (WHERE status = 'ativa'),
      count(*) FILTER (WHERE status IN ('incompleta', 'aguardando_aprovacao'))
    INTO v_total, v_ativas, v_pendentes
    FROM quotas WHERE lote_id = v.lote_id;

    IF v_pendentes = 0 THEN
      UPDATE lotes_compra
      SET status = CASE
        WHEN v_ativas = v_total THEN 'aprovado_total'
        WHEN v_ativas > 0 THEN 'aprovado_parcial'
        ELSE 'encerrado'
      END,
      decidido_em = COALESCE(decidido_em, now())
      WHERE id = v.lote_id;
    END IF;
  END IF;

  INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'ativar_quota_manual', 'quota', p_quota_id::text,
          jsonb_build_object('motivo', p_motivo, 'user_id', v.user_id));

  RETURN jsonb_build_object('ok', true, 'quota_id', p_quota_id);
END $function$;

-- Backfill K.2: lotes presos em 'incompleta' com todas as quotas já decididas
WITH stats AS (
  SELECT lote_id,
         count(*) AS total,
         count(*) FILTER (WHERE status = 'ativa') AS ativas,
         count(*) FILTER (WHERE status IN ('incompleta', 'aguardando_aprovacao')) AS pendentes
  FROM quotas
  WHERE lote_id IS NOT NULL
  GROUP BY lote_id
),
updated AS (
  UPDATE lotes_compra l
  SET status = CASE
    WHEN s.ativas = s.total THEN 'aprovado_total'
    WHEN s.ativas > 0 THEN 'aprovado_parcial'
    ELSE 'encerrado'
  END,
  decidido_em = COALESCE(l.decidido_em, now())
  FROM stats s
  WHERE l.id = s.lote_id
    AND l.status = 'incompleta'
    AND s.pendentes = 0
  RETURNING l.id, l.status
)
INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
SELECT NULL, 'backfill_lote_status_k2', 'lote', id::text,
       jsonb_build_object('motivo', 'Saneamento K.2: lote ativado via Recuperação ficou preso em incompleta', 'novo_status', status)
FROM updated;