CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE backups.matches_pre_n12 AS TABLE public.matches;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS estatisticas jsonb;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS escalacoes jsonb;