-- Backup das 3 funções afetadas na Etapa 2.3
CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE IF NOT EXISTS backups.functions_pre_2_3 AS
SELECT 
  n.nspname AS schema,
  p.proname AS funcao,
  pg_get_functiondef(p.oid) AS definicao,
  now() AS backup_em
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'alertar_capacidade',
    'trigger_snapshot_top4_potencial_inicial',
    'trigger_recalc_pontos_on_match_update'
  );

-- Sub-deploy A: alertar_capacidade passa a enviar x-cron-secret
CREATE OR REPLACE FUNCTION public.alertar_capacidade()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check jsonb;
  v_nivel text;
  v_req_id bigint;
  v_cron_secret text;
BEGIN
  v_check := public.check_capacidade();
  v_nivel := v_check->>'nivel_geral';
  
  IF v_nivel = 'vermelho' THEN
    INSERT INTO public.audit_log (acao, entidade, entidade_id, payload)
    VALUES ('alerta_capacidade_vermelho', 'sistema', 'capacidade',
            jsonb_build_object('check', v_check));
    BEGIN
      SELECT value #>> '{}' INTO v_cron_secret FROM public.settings WHERE key = 'cron_secret';
      SELECT net.http_post(
        url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/send-capacidade-alerta',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', COALESCE(v_cron_secret, '')
        ),
        body := jsonb_build_object('check', v_check)
      ) INTO v_req_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'alertar_capacidade: falha ao disparar email: %', SQLERRM;
    END;
  ELSIF v_nivel = 'amarelo' THEN
    INSERT INTO public.audit_log (acao, entidade, entidade_id, payload)
    VALUES ('alerta_capacidade_amarelo', 'sistema', 'capacidade',
            jsonb_build_object('check', v_check));
  END IF;
  
  RETURN v_check;
END $function$;