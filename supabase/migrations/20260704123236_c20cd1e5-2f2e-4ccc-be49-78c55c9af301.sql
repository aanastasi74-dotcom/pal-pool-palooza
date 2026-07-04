CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.matches_pre_rodada_q;
CREATE TABLE backups.matches_pre_rodada_q AS
SELECT id, numero_jogo, status, updated_at, now() AS backup_em
FROM public.matches;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS status_api text NULL,
  ADD COLUMN IF NOT EXISTS minuto_atual smallint NULL,
  ADD COLUMN IF NOT EXISTS minuto_extra smallint NULL;

COMMENT ON COLUMN public.matches.status_api IS 'Código curto de status da API-Football (1H, 2H, HT, ET, BT, P, FT, AET, PEN, NS)';
COMMENT ON COLUMN public.matches.minuto_atual IS 'Minuto do relógio do jogo (elapsed da API-Football). NULL se não em andamento.';
COMMENT ON COLUMN public.matches.minuto_extra IS 'Minutos de descontos (extra). Usar em conjunto com minuto_atual: "45+extra"';