
DO $$
DECLARE
  v_apikey text;
BEGIN
  SELECT value #>> '{}' INTO v_apikey FROM public.settings WHERE key = 'supabase_anon_key';

  -- Remove agendamento antigo, se existir
  PERFORM cron.unschedule('enviar-lembretes-diarios')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enviar-lembretes-diarios');

  PERFORM cron.schedule(
    'enviar-lembretes-diarios',
    '0 23 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/enviar-lembretes-diarios',
        headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', %L),
        body := '{}'::jsonb
      );
    $cron$, COALESCE(v_apikey, ''))
  );
END $$;
