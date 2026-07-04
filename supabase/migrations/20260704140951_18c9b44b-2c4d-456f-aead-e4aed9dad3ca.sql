DELETE FROM public.settings WHERE key = 'top4_auto_edge_url';

CREATE OR REPLACE FUNCTION public.trg_top4_auto_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enabled boolean;
  v_secret text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'encerrado' THEN RETURN NEW; END IF;
  IF OLD.status = 'encerrado' THEN RETURN NEW; END IF;
  IF NEW.fase NOT IN ('Quartas', 'Final', 'Disputa de terceiro') THEN RETURN NEW; END IF;

  BEGIN
    SELECT (value #>> '{}')::boolean INTO v_enabled
    FROM public.settings WHERE key = 'top4_auto_parcial_enabled';
  EXCEPTION WHEN OTHERS THEN v_enabled := false;
  END;
  IF v_enabled IS NOT TRUE THEN RETURN NEW; END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_secret := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/calcular-pontos-top4-auto',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(v_secret, '')
      ),
      body := jsonb_build_object('trigger', 'match_encerrado', 'match_id', NEW.id::text, 'fase', NEW.fase)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'trg_top4_auto_recalc: http_post falhou para match_id=%: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;