
-- Backup defensivo das quotas
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.quotas_pre_p11 AS TABLE public.quotas;

-- P.1.2.1 — coluna snapshot do potencial inicial
ALTER TABLE public.quotas
  ADD COLUMN IF NOT EXISTS top4_potencial_inicial integer DEFAULT NULL;

COMMENT ON COLUMN public.quotas.top4_potencial_inicial IS
  'Snapshot do potencial máximo do Top 4 calculado no momento que a fase de grupos terminou (M72 encerrado). Comparação com potencial atual permite mostrar "caiu N pts após eliminação".';

-- P.1.2.3 — trigger que dispara a edge function quando o último jogo de grupo encerra
CREATE OR REPLACE FUNCTION public.trigger_snapshot_top4_potencial_inicial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_encerrados int;
  v_url text;
  v_apikey text;
BEGIN
  IF NEW.numero_jogo BETWEEN 1 AND 72
     AND NEW.status = 'encerrado'
     AND COALESCE(OLD.status, '') <> 'encerrado' THEN

    SELECT COUNT(*) INTO v_total_encerrados
    FROM public.matches
    WHERE numero_jogo BETWEEN 1 AND 72 AND status = 'encerrado';

    IF v_total_encerrados = 72 THEN
      SELECT value #>> '{}' INTO v_url
        FROM public.settings WHERE key = 'app_url_publico';
      SELECT value #>> '{}' INTO v_apikey
        FROM public.settings WHERE key = 'supabase_anon_key';

      BEGIN
        PERFORM net.http_post(
          url := COALESCE(v_url, 'https://sngdtpwpxpjfmkmqnuyi.supabase.co')
                 || '/functions/v1/snapshot-top4-potenciais-iniciais',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(v_apikey, ''),
            'apikey', COALESCE(v_apikey, '')
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

DROP TRIGGER IF EXISTS trg_snapshot_top4_potencial_inicial ON public.matches;
CREATE TRIGGER trg_snapshot_top4_potencial_inicial
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_snapshot_top4_potencial_inicial();
