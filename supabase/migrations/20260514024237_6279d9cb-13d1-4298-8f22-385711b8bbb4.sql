-- I.5.1 — Fix proximo_numero_quota
CREATE OR REPLACE FUNCTION public.proximo_numero_quota(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM public.quotas
  WHERE user_id = p_user_id
    AND status IN ('incompleta', 'aguardando_aprovacao', 'ativa', 'rejeitada', 'encerrada')
    AND numero IS NOT NULL;
$$;

-- I.5.2 — enviar_comprovante_lote (atômico)
CREATE OR REPLACE FUNCTION public.enviar_comprovante_lote(
  p_lote_id uuid,
  p_comprovante_url text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_lote record;
  v_quota record;
  v_numero integer;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_lote FROM lotes_compra WHERE id = p_lote_id FOR UPDATE;
  IF v_lote.id IS NULL THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;
  v_user_id := v_lote.user_id;
  IF v_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão pra este lote';
  END IF;

  -- Atribui número e atualiza cada quota do lote (incompleta ou rejeitada)
  FOR v_quota IN
    SELECT id, numero, status
    FROM quotas
    WHERE lote_id = p_lote_id AND status IN ('incompleta', 'rejeitada')
    ORDER BY created_at
  LOOP
    IF v_quota.numero IS NOT NULL AND v_quota.numero > 0 THEN
      v_numero := v_quota.numero;
    ELSE
      v_numero := public.proximo_numero_quota(v_user_id);
    END IF;
    UPDATE quotas
    SET status = 'aguardando_aprovacao',
        numero = v_numero,
        motivo_rejeicao = NULL
    WHERE id = v_quota.id;

    -- Garante payment pendente apontando pro comprovante novo
    IF EXISTS (SELECT 1 FROM payments WHERE quota_id = v_quota.id AND lote_id = p_lote_id) THEN
      UPDATE payments
      SET status = 'pendente',
          comprovante_path = p_comprovante_url,
          motivo_rejeicao = NULL,
          aprovado_em = NULL,
          aprovado_por = NULL
      WHERE quota_id = v_quota.id AND lote_id = p_lote_id;
    ELSE
      INSERT INTO payments (user_id, quota_id, lote_id, valor, comprovante_path, status)
      VALUES (v_user_id, v_quota.id, p_lote_id, 50.00, p_comprovante_url, 'pendente');
    END IF;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Lote sem quotas pra processar';
  END IF;

  UPDATE lotes_compra
  SET status = 'aguardando_aprovacao',
      comprovante_url = p_comprovante_url,
      tentativas_comprovante = COALESCE(tentativas_comprovante, 0) + 1,
      motivo_rejeicao = NULL
  WHERE id = p_lote_id;

  RETURN jsonb_build_object('ok', true, 'lote_id', p_lote_id, 'count', v_count);
END $$;

-- I.5.3 — aprovar_lote (com aprovação parcial opcional)
CREATE OR REPLACE FUNCTION public.aprovar_lote(
  p_lote_id uuid,
  p_aprovar_n integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_quota record;
  v_total integer;
  v_aprovar integer;
  v_aprovadas integer := 0;
  v_rejeitadas integer := 0;
  v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode aprovar lote';
  END IF;
  SELECT user_id INTO v_user_id FROM lotes_compra WHERE id = p_lote_id FOR UPDATE;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;

  SELECT count(*) INTO v_total FROM quotas WHERE lote_id = p_lote_id;
  v_aprovar := COALESCE(p_aprovar_n, v_total);
  IF v_aprovar < 0 OR v_aprovar > v_total THEN
    RAISE EXCEPTION 'Quantidade a aprovar inválida (% de %)', v_aprovar, v_total;
  END IF;

  FOR v_quota IN
    SELECT id, numero FROM quotas WHERE lote_id = p_lote_id ORDER BY numero NULLS LAST, created_at
  LOOP
    IF v_aprovadas < v_aprovar THEN
      IF v_quota.numero IS NULL THEN
        RAISE EXCEPTION 'Quota % sem numero — não pode aprovar. Use ativação manual antes.', v_quota.id;
      END IF;
      -- Garante payment aprovado
      IF EXISTS (SELECT 1 FROM payments WHERE quota_id = v_quota.id AND lote_id = p_lote_id) THEN
        UPDATE payments
        SET status = 'aprovado', aprovado_em = v_now, aprovado_por = auth.uid(), motivo_rejeicao = NULL
        WHERE quota_id = v_quota.id AND lote_id = p_lote_id;
      ELSE
        INSERT INTO payments (user_id, quota_id, lote_id, valor, status, aprovado_em, aprovado_por)
        VALUES (v_user_id, v_quota.id, p_lote_id, 50.00, 'aprovado', v_now, auth.uid());
      END IF;
      UPDATE quotas SET status = 'ativa', paga_em = v_now WHERE id = v_quota.id;
      v_aprovadas := v_aprovadas + 1;
    ELSE
      UPDATE payments
      SET status = 'rejeitado',
          motivo_rejeicao = format('Pagamento parcial: apenas %s de %s aprovadas', v_aprovar, v_total),
          aprovado_em = v_now, aprovado_por = auth.uid()
      WHERE quota_id = v_quota.id AND lote_id = p_lote_id;
      UPDATE quotas
      SET status = 'rejeitada',
          motivo_rejeicao = format('Pagamento parcial: apenas %s de %s aprovadas', v_aprovar, v_total)
      WHERE id = v_quota.id;
      v_rejeitadas := v_rejeitadas + 1;
    END IF;
  END LOOP;

  UPDATE lotes_compra
  SET status = CASE WHEN v_rejeitadas = 0 THEN 'aprovado_total' ELSE 'aprovado_parcial' END,
      decidido_em = v_now
  WHERE id = p_lote_id;

  INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'aprovar_lote', 'lote', p_lote_id::text,
          jsonb_build_object('aprovadas', v_aprovadas, 'rejeitadas', v_rejeitadas, 'total', v_total));

  RETURN jsonb_build_object('ok', true, 'aprovadas', v_aprovadas, 'rejeitadas', v_rejeitadas);
END $$;

-- I.5.3b — rejeitar_lote (3-strike por lote, nunca cross-lote)
CREATE OR REPLACE FUNCTION public.rejeitar_lote(
  p_lote_id uuid,
  p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote record;
  v_now timestamptz := now();
  v_novas_tent integer;
  v_encerrar boolean;
  v_status_lote text;
  v_status_quota text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode rejeitar lote';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório';
  END IF;
  SELECT * INTO v_lote FROM lotes_compra WHERE id = p_lote_id FOR UPDATE;
  IF v_lote.id IS NULL THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;

  v_novas_tent := COALESCE(v_lote.tentativas_comprovante, 0);
  v_encerrar := v_novas_tent >= 3;
  v_status_lote := CASE WHEN v_encerrar THEN 'encerrado' ELSE 'rejeitado' END;
  v_status_quota := CASE WHEN v_encerrar THEN 'encerrada' ELSE 'rejeitada' END;

  UPDATE lotes_compra
  SET status = v_status_lote, motivo_rejeicao = p_motivo, decidido_em = v_now
  WHERE id = p_lote_id;

  UPDATE payments
  SET status = 'rejeitado', motivo_rejeicao = p_motivo, aprovado_em = v_now, aprovado_por = auth.uid()
  WHERE lote_id = p_lote_id;

  UPDATE quotas
  SET status = v_status_quota, motivo_rejeicao = p_motivo
  WHERE lote_id = p_lote_id;

  INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'rejeitar_lote', 'lote', p_lote_id::text,
          jsonb_build_object('motivo', p_motivo, 'tentativas', v_novas_tent, 'encerrado', v_encerrar));

  RETURN jsonb_build_object('ok', true, 'encerrado', v_encerrar);
END $$;

-- I.5.4 — ativar_quota_manual (admin)
CREATE OR REPLACE FUNCTION public.ativar_quota_manual(
  p_quota_id uuid,
  p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v record;
  v_numero integer;
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

  INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'ativar_quota_manual', 'quota', p_quota_id::text,
          jsonb_build_object('motivo', p_motivo, 'user_id', v.user_id));

  RETURN jsonb_build_object('ok', true, 'quota_id', p_quota_id);
END $$;

-- I.5.5 — encerrar_lote_por_decisao (admin, sem strike)
CREATE OR REPLACE FUNCTION public.encerrar_lote_por_decisao(
  p_lote_id uuid,
  p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 10 caracteres)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lotes_compra WHERE id = p_lote_id) THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;

  UPDATE quotas SET status = 'encerrada', motivo_rejeicao = p_motivo WHERE lote_id = p_lote_id;
  UPDATE payments
  SET status = 'rejeitado', motivo_rejeicao = p_motivo, aprovado_em = v_now, aprovado_por = auth.uid()
  WHERE lote_id = p_lote_id AND status <> 'aprovado';
  UPDATE lotes_compra
  SET status = 'encerrado', motivo_rejeicao = p_motivo, decidido_em = v_now
  WHERE id = p_lote_id;

  INSERT INTO audit_log (ator_id, acao, entidade, entidade_id, payload)
  VALUES (auth.uid(), 'encerrar_lote_decisao', 'lote', p_lote_id::text,
          jsonb_build_object('motivo', p_motivo));

  RETURN jsonb_build_object('ok', true);
END $$;