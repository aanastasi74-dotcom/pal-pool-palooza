INSERT INTO backups.functions_pre_2_3 (schema, funcao, definicao, backup_em)
SELECT 'public', 'trigger_recalc_pontos_on_match_update',
       pg_get_functiondef(p.oid), now()
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='trigger_recalc_pontos_on_match_update';

CREATE OR REPLACE FUNCTION public.trigger_recalc_pontos_on_match_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/calcular-pontos';
  v_apikey text;
  v_cron_secret text;
BEGIN
  IF NEW.status = 'encerrado'
     AND NEW.placar_casa IS NOT NULL
     AND NEW.placar_fora IS NOT NULL
     AND (TG_OP = 'INSERT' OR
          NEW.placar_casa IS DISTINCT FROM OLD.placar_casa OR
          NEW.placar_fora IS DISTINCT FROM OLD.placar_fora OR
          NEW.status IS DISTINCT FROM OLD.status) THEN

    SELECT value #>> '{}' INTO v_apikey FROM public.settings WHERE key = 'supabase_anon_key';
    SELECT value #>> '{}' INTO v_cron_secret FROM public.settings WHERE key = 'cron_secret';

    BEGIN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', COALESCE(v_apikey, ''),
          'x-cron-secret', COALESCE(v_cron_secret, '')
        ),
        body := jsonb_build_object('match_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'trigger_recalc_pontos: falha ao disparar: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;