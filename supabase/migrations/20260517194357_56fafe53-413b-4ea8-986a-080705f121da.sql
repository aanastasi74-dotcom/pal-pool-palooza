
-- Backups
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.top4_predictions_pre_k3_3 AS SELECT * FROM public.top4_predictions;
CREATE TABLE IF NOT EXISTS backups.settings_pre_k3_3 AS SELECT * FROM public.settings;
CREATE TABLE IF NOT EXISTS backups.quotas_pre_k3_3 AS SELECT * FROM public.quotas;

-- Nova coluna
ALTER TABLE public.top4_predictions
  ADD COLUMN IF NOT EXISTS pontos_calculados integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.top4_predictions.pontos_calculados IS
  'Pontos do palpite Top 4 calculados ao fim da Copa. Inicia em 0, atualizado pela edge function calcular-pontos-top4.';

-- Atualiza trigger para proteger pontos_calculados e bypass de service role
CREATE OR REPLACE FUNCTION public.protect_top4_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fase text;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.quota_id := OLD.quota_id;
    NEW.pontos_calculados := OLD.pontos_calculados;
    IF (NEW.posicao_1 IS DISTINCT FROM OLD.posicao_1)
       OR (NEW.posicao_2 IS DISTINCT FROM OLD.posicao_2)
       OR (NEW.posicao_3 IS DISTINCT FROM OLD.posicao_3)
       OR (NEW.posicao_4 IS DISTINCT FROM OLD.posicao_4) THEN
      v_fase := public.fase_atual_copa();
      IF v_fase IN ('oitavas', 'quartas', 'semis', 'final') THEN
        RAISE EXCEPTION 'Top 4 não pode mais ser alterado: a janela fechou após o Round of 32';
      END IF;
      NEW.alterado_em := now();
      NEW.fase_alteracao := v_fase;
    ELSE
      NEW.alterado_em := OLD.alterado_em;
      NEW.fase_alteracao := OLD.fase_alteracao;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Settings seed
INSERT INTO public.settings (key, value) VALUES (
  'top4_oficial',
  '{"campeao": null, "vice": null, "terceiro": null, "quarto": null}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
