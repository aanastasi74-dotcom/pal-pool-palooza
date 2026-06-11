
-- Backups
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE backups.predictions_pre_n9 AS TABLE public.predictions;
CREATE TABLE backups.matches_pre_n9 AS TABLE public.matches;

-- Parte 1: trigger de deadline em predictions
CREATE OR REPLACE FUNCTION public.check_prediction_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _data timestamptz;
  _deadline timestamptz;
BEGIN
  SELECT data_jogo INTO _data FROM public.matches WHERE id = NEW.match_id;
  IF _data IS NULL THEN
    RETURN NEW;
  END IF;
  _deadline := _data - interval '5 minutes';
  IF now() >= _deadline THEN
    RAISE EXCEPTION 'Prazo para palpitar este jogo encerrado (trava 5 minutos antes do horário previsto, %)', _data
      USING HINT = 'Ver §5 do regulamento — janela de palpite fecha 5 min antes do horário previsto.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_prediction_deadline ON public.predictions;
CREATE TRIGGER trg_check_prediction_deadline
BEFORE INSERT OR UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.check_prediction_deadline();

-- Parte 2: cron pg_cron pra popular travado_em
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'travar-palpites') THEN
    PERFORM cron.unschedule('travar-palpites');
  END IF;
END $$;

SELECT cron.schedule(
  'travar-palpites',
  '* * * * *',
  $cron$
  UPDATE public.matches
  SET travado_em = data_jogo - interval '5 minutes'
  WHERE travado_em IS NULL
    AND data_jogo IS NOT NULL
    AND now() >= data_jogo - interval '5 minutes';
  $cron$
);

-- Disparo imediato pra popular retroativamente (não espera 1 min)
UPDATE public.matches
SET travado_em = data_jogo - interval '5 minutes'
WHERE travado_em IS NULL
  AND data_jogo IS NOT NULL
  AND now() >= data_jogo - interval '5 minutes';
