CREATE OR REPLACE FUNCTION public.trigger_snapshot_top4_potencial_inicial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_encerrados int;
  v_apikey text;
  v_cron_secret text;
BEGIN
  IF NEW.numero_jogo BETWEEN 1 AND 72
     AND NEW.status = 'encerrado'
     AND COALESCE(OLD.status, '') <> 'encerrado' THEN
    SELECT COUNT(*) INTO v_total_encerrados
    FROM public.matches
    WHERE numero_jogo BETWEEN 1 AND 72 AND status = 'encerrado';
    IF v_total_encerrados = 72 THEN
      SELECT value #>> '{}' INTO v_apikey
        FROM public.settings WHERE key = 'supabase_anon_key';
      SELECT value #>> '{}' INTO v_cron_secret
        FROM public.settings WHERE key = 'cron_secret';
      BEGIN
        PERFORM net.http_post(
          url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/snapshot-top4-potenciais-iniciais',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(v_apikey, ''),
            'apikey', COALESCE(v_apikey, ''),
            'x-cron-secret', COALESCE(v_cron_secret, '')
          ),
          body := '{}'::jsonb
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'trigger_snapshot_top4_potencial_inicial: falha ao disparar: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;