
-- ============ I.1.5 RESET ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Aborting reset: nenhum profile admin encontrado pra preservar.';
  END IF;
END $$;

TRUNCATE TABLE
  public.predictions,
  public.top4_predictions,
  public.quotas,
  public.payments,
  public.audit_log,
  public.bulletins,
  public.reports,
  public.invites,
  public.lotes_compra
CASCADE;

DELETE FROM public.profiles WHERE role <> 'admin';

UPDATE public.matches
SET placar_casa = NULL, placar_fora = NULL, status = 'agendado'
WHERE status <> 'agendado'
   OR placar_casa IS NOT NULL
   OR placar_fora IS NOT NULL;

-- ============ I.1.1 LIMITES ============
CREATE OR REPLACE FUNCTION public.limite_perebas_hard()
RETURNS smallint LANGUAGE sql IMMUTABLE AS $$ SELECT 350::smallint $$;

CREATE OR REPLACE FUNCTION public.limite_quotas_global_hard()
RETURNS smallint LANGUAGE sql IMMUTABLE AS $$ SELECT 1500::smallint $$;

INSERT INTO public.settings (key, value)
VALUES ('limite_quotas_por_pereba_default', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS limite_quotas_custom smallint;

CREATE OR REPLACE VIEW public.vw_perebas_count AS
SELECT
  (SELECT count(*) FROM public.profiles WHERE COALESCE(role,'pereba') <> 'sistema')::int AS signups,
  (SELECT count(*) FROM public.invites
    WHERE status = 'pendente' AND (expira_em IS NULL OR expira_em > now()))::int AS convites_pendentes,
  ((SELECT count(*) FROM public.profiles WHERE COALESCE(role,'pereba') <> 'sistema') +
   (SELECT count(*) FROM public.invites
    WHERE status = 'pendente' AND (expira_em IS NULL OR expira_em > now())))::int AS total;

CREATE OR REPLACE FUNCTION public.limite_quotas_pereba(p_user_id uuid)
RETURNS smallint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_custom smallint;
  v_default smallint;
BEGIN
  SELECT limite_quotas_custom INTO v_custom FROM profiles WHERE id = p_user_id;
  IF v_custom IS NOT NULL THEN RETURN v_custom; END IF;
  SELECT NULLIF(value::text, '')::smallint INTO v_default
    FROM settings WHERE key='limite_quotas_por_pereba_default';
  RETURN COALESCE(v_default, 5::smallint);
END;
$$;

CREATE OR REPLACE FUNCTION public.pode_comprar_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_global int; total_pereba int; limite_pereba int;
BEGIN
  SELECT count(*) INTO total_global FROM quotas
    WHERE status IN ('ativa','aguardando_aprovacao');
  IF total_global >= public.limite_quotas_global_hard() THEN
    RETURN jsonb_build_object('pode', false,
      'motivo', 'Limite global de ' || public.limite_quotas_global_hard() || ' quotas atingido.');
  END IF;

  SELECT count(*) INTO total_pereba FROM quotas
    WHERE user_id = p_user_id AND status IN ('ativa','aguardando_aprovacao');
  limite_pereba := public.limite_quotas_pereba(p_user_id);

  IF total_pereba >= limite_pereba THEN
    RETURN jsonb_build_object('pode', false,
      'motivo', 'Você atingiu o limite de ' || limite_pereba || ' quotas. Fale com um admin se quiser comprar mais.');
  END IF;

  RETURN jsonb_build_object('pode', true,
    'restantes_individual', limite_pereba - total_pereba,
    'restantes_global', public.limite_quotas_global_hard() - total_global);
END;
$$;

CREATE OR REPLACE FUNCTION public.pode_emitir_convite()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total_count int;
BEGIN
  SELECT total INTO total_count FROM vw_perebas_count;
  IF total_count >= public.limite_perebas_hard() THEN
    RETURN jsonb_build_object('pode', false,
      'motivo', 'Limite de ' || public.limite_perebas_hard() ||
                ' perebas atingido. Aguardar liberação por expiração/recusa.');
  END IF;
  RETURN jsonb_build_object('pode', true,
    'restantes', public.limite_perebas_hard() - total_count);
END;
$$;

-- ============ I.1.4 TRIGGER DATA INTEGRITY ============
CREATE OR REPLACE FUNCTION public.check_quota_ativa_tem_payment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ativa' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.payments
      WHERE quota_id = NEW.id AND status = 'aprovado'
    ) THEN
      RAISE EXCEPTION 'Quota não pode ser ativa sem payment aprovado correspondente (quota_id=%)', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_quota_ativa_payment ON public.quotas;
CREATE TRIGGER trg_check_quota_ativa_payment
  BEFORE INSERT OR UPDATE ON public.quotas
  FOR EACH ROW EXECUTE FUNCTION public.check_quota_ativa_tem_payment();

-- ============ I.1.3 ARRECADAÇÃO ============
CREATE OR REPLACE FUNCTION public.get_arrecadacao_atual()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(count(*) * 50, 0)::numeric
  FROM public.quotas WHERE status = 'ativa';
$$;

CREATE OR REPLACE FUNCTION public.get_arrecadacao_potencial()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(count(*) * 50, 0)::numeric
  FROM public.quotas
  WHERE status IN ('ativa','aguardando_aprovacao','rejeitada');
$$;
