-- 1) Backup
CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.top4_predictions_pre_p4;
CREATE TABLE backups.top4_predictions_pre_p4 AS TABLE public.top4_predictions;

-- 2) Settings
INSERT INTO public.settings (key, value)
VALUES ('top4_auto_parcial_enabled', to_jsonb(false))
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value)
VALUES ('top4_auto_edge_url', to_jsonb(''::text))
ON CONFLICT (key) DO NOTHING;

-- 3) Trigger function — dispara edge parcial após encerrar jogo relevante
CREATE OR REPLACE FUNCTION public.trg_top4_auto_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enabled boolean;
  v_url text;
  v_secret text;
BEGIN
  -- Só age quando status muda pra encerrado
  IF NEW.status IS DISTINCT FROM 'encerrado' THEN RETURN NEW; END IF;
  IF OLD.status = 'encerrado' THEN RETURN NEW; END IF;
  -- Só nas fases decisivas do Top 4
  IF NEW.fase NOT IN ('Quartas', 'Final', 'Disputa de terceiro') THEN RETURN NEW; END IF;

  BEGIN
    SELECT (value #>> '{}')::boolean INTO v_enabled
    FROM public.settings WHERE key = 'top4_auto_parcial_enabled';
  EXCEPTION WHEN OTHERS THEN v_enabled := false;
  END;
  IF v_enabled IS NOT TRUE THEN RETURN NEW; END IF;

  SELECT (value #>> '{}') INTO v_url FROM public.settings WHERE key = 'top4_auto_edge_url';
  IF v_url IS NULL OR length(v_url) < 10 THEN RETURN NEW; END IF;

  -- Secret vem de vault se disponível; senão só chama sem header (edge rejeita)
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_secret := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(v_secret, '')
      ),
      body := jsonb_build_object('trigger', 'match_encerrado', 'match_id', NEW.id::text, 'fase', NEW.fase)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Nunca falhar o UPDATE do jogo por causa da chamada http
    RAISE LOG 'trg_top4_auto_recalc: http_post falhou para match_id=%: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_top4_auto_recalc ON public.matches;
CREATE TRIGGER matches_top4_auto_recalc
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_top4_auto_recalc();