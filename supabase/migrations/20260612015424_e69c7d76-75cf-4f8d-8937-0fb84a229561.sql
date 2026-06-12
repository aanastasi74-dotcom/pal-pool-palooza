CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.boletins_pre_n14;
CREATE TABLE backups.boletins_pre_n14 AS TABLE public.boletins;
ALTER TABLE public.boletins ADD COLUMN IF NOT EXISTS enviado_em timestamptz;