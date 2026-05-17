-- Garante schema backups
CREATE SCHEMA IF NOT EXISTS backups;

-- Backup pré-rodada (idempotente)
CREATE TABLE IF NOT EXISTS backups.matches_pre_k3_2 AS SELECT * FROM public.matches;

-- Novas colunas
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS placar_casa_prorrogacao integer,
  ADD COLUMN IF NOT EXISTS placar_fora_prorrogacao integer,
  ADD COLUMN IF NOT EXISTS penaltis_casa integer,
  ADD COLUMN IF NOT EXISTS penaltis_fora integer,
  ADD COLUMN IF NOT EXISTS eventos jsonb;

COMMENT ON COLUMN public.matches.placar_casa IS 'Gols do mandante no TEMPO NORMAL apenas (90 + acréscimos). Não inclui prorrogação.';
COMMENT ON COLUMN public.matches.placar_fora IS 'Gols do visitante no TEMPO NORMAL apenas (90 + acréscimos). Não inclui prorrogação.';
COMMENT ON COLUMN public.matches.placar_casa_prorrogacao IS 'Gols do mandante na prorrogação apenas. Nullable.';
COMMENT ON COLUMN public.matches.placar_fora_prorrogacao IS 'Gols do visitante na prorrogação apenas. Nullable.';
COMMENT ON COLUMN public.matches.penaltis_casa IS 'Gols do mandante na disputa de pênaltis. Nullable.';
COMMENT ON COLUMN public.matches.penaltis_fora IS 'Gols do visitante na disputa de pênaltis. Nullable.';
COMMENT ON COLUMN public.matches.eventos IS 'JSONB com detalhes (gols, cartões, escalações, estatísticas). Nullable.';

-- derivar_periodo
CREATE OR REPLACE FUNCTION public.derivar_periodo(p_minuto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_minuto LIKE '45+%' OR p_minuto LIKE '90+%' THEN 'tempo_normal'
    WHEN p_minuto LIKE '105+%' OR p_minuto LIKE '120+%' THEN 'prorrogacao'
    WHEN p_minuto ~ '^[0-9]+$' THEN
      CASE WHEN p_minuto::int <= 90 THEN 'tempo_normal' ELSE 'prorrogacao' END
    ELSE 'desconhecido'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.derivar_periodo(text) TO authenticated, anon;

-- vencedor_real
CREATE OR REPLACE FUNCTION public.vencedor_real(p_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN m.placar_casa > m.placar_fora THEN m.team_home_id
    WHEN m.placar_casa < m.placar_fora THEN m.team_away_id
    WHEN m.placar_casa_prorrogacao IS NOT NULL AND m.placar_fora_prorrogacao IS NOT NULL THEN
      CASE
        WHEN m.placar_casa_prorrogacao > m.placar_fora_prorrogacao THEN m.team_home_id
        WHEN m.placar_casa_prorrogacao < m.placar_fora_prorrogacao THEN m.team_away_id
        WHEN m.penaltis_casa IS NOT NULL AND m.penaltis_fora IS NOT NULL THEN
          CASE
            WHEN m.penaltis_casa > m.penaltis_fora THEN m.team_home_id
            ELSE m.team_away_id
          END
        ELSE NULL
      END
    ELSE NULL
  END
  FROM public.matches m
  WHERE m.id = p_match_id;
$$;

GRANT EXECUTE ON FUNCTION public.vencedor_real(uuid) TO authenticated;

-- Trigger recálculo automático
CREATE OR REPLACE FUNCTION public.trigger_recalc_pontos_on_match_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/calcular-pontos';
  v_apikey text;
BEGIN
  IF NEW.status = 'encerrado'
     AND NEW.placar_casa IS NOT NULL
     AND NEW.placar_fora IS NOT NULL
     AND (TG_OP = 'INSERT' OR
          NEW.placar_casa IS DISTINCT FROM OLD.placar_casa OR
          NEW.placar_fora IS DISTINCT FROM OLD.placar_fora OR
          NEW.status IS DISTINCT FROM OLD.status) THEN

    SELECT value #>> '{}' INTO v_apikey FROM public.settings WHERE key = 'supabase_anon_key';

    BEGIN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', COALESCE(v_apikey, '')
        ),
        body := jsonb_build_object('match_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'trigger_recalc_pontos: falha ao disparar: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pontos_on_match_update ON public.matches;
CREATE TRIGGER trg_recalc_pontos_on_match_update
  AFTER INSERT OR UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_pontos_on_match_update();