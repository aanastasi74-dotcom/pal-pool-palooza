-- Backup
CREATE SCHEMA IF NOT EXISTS backups;

DROP TABLE IF EXISTS backups.boletins_schema_pre_extra;
CREATE TABLE backups.boletins_schema_pre_extra AS
SELECT conname, contype, pg_get_constraintdef(c.oid) AS definicao, now() AS backup_em
FROM pg_constraint c
JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public' AND t.relname='boletins';

DROP TABLE IF EXISTS backups.boletins_data_pre_extra;
CREATE TABLE backups.boletins_data_pre_extra AS
SELECT *, now() AS backup_em FROM public.boletins;

-- Colunas novas
ALTER TABLE public.boletins
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'regular'
    CHECK (tipo IN ('regular','extraordinario'));

ALTER TABLE public.boletins
  ADD COLUMN IF NOT EXISTS titulo_customizado text NULL;

-- Swap UNIQUE
ALTER TABLE public.boletins
  DROP CONSTRAINT IF EXISTS boletins_data_referencia_key;

ALTER TABLE public.boletins
  ADD CONSTRAINT boletins_data_referencia_tipo_key
    UNIQUE (data_referencia, tipo);