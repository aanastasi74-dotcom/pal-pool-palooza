
CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.matches_pre_n30;
CREATE TABLE backups.matches_pre_n30 AS TABLE public.matches;

UPDATE public.matches SET data_jogo = '2026-06-28 16:00:00-03'::timestamptz WHERE numero_jogo = 73;

UPDATE public.matches SET data_jogo = '2026-06-29 17:30:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Gillette Stadium')
WHERE numero_jogo = 74;

UPDATE public.matches SET data_jogo = '2026-06-29 22:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Estádio BBVA')
WHERE numero_jogo = 75;

UPDATE public.matches SET data_jogo = '2026-06-29 14:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'NRG Stadium')
WHERE numero_jogo = 76;

UPDATE public.matches SET data_jogo = '2026-06-30 18:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'MetLife Stadium')
WHERE numero_jogo = 77;

UPDATE public.matches SET data_jogo = '2026-06-30 14:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'AT&T Stadium')
WHERE numero_jogo = 78;

UPDATE public.matches SET data_jogo = '2026-07-01 21:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Levi''s Stadium')
WHERE numero_jogo = 81;

UPDATE public.matches SET data_jogo = '2026-07-01 17:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Lumen Field')
WHERE numero_jogo = 82;

UPDATE public.matches SET data_jogo = '2026-07-02 20:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'BMO Field')
WHERE numero_jogo = 83;

UPDATE public.matches SET data_jogo = '2026-07-02 16:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'SoFi Stadium')
WHERE numero_jogo = 84;

UPDATE public.matches SET data_jogo = '2026-07-03 19:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Hard Rock Stadium')
WHERE numero_jogo = 86;

UPDATE public.matches SET data_jogo = '2026-07-03 22:30:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Arrowhead Stadium')
WHERE numero_jogo = 87;

UPDATE public.matches SET data_jogo = '2026-07-03 15:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'AT&T Stadium')
WHERE numero_jogo = 88;

UPDATE public.matches SET data_jogo = '2026-07-04 18:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'Lincoln Financial Field')
WHERE numero_jogo = 89;

UPDATE public.matches SET data_jogo = '2026-07-04 14:00:00-03'::timestamptz,
  stadium_id = (SELECT id FROM public.stadiums WHERE nome = 'NRG Stadium')
WHERE numero_jogo = 90;
