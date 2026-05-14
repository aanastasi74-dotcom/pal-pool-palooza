CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE backups.quotas_pre_i5             AS SELECT * FROM public.quotas;
CREATE TABLE backups.payments_pre_i5           AS SELECT * FROM public.payments;
CREATE TABLE backups.lotes_compra_pre_i5       AS SELECT * FROM public.lotes_compra;
CREATE TABLE backups.predictions_pre_i5        AS SELECT * FROM public.predictions;
CREATE TABLE backups.top4_predictions_pre_i5   AS SELECT * FROM public.top4_predictions;
CREATE TABLE backups.profiles_pre_i5           AS SELECT * FROM public.profiles;
CREATE TABLE backups.settings_pre_i5           AS SELECT * FROM public.settings;
CREATE TABLE backups.audit_log_pre_i5          AS SELECT * FROM public.audit_log;
CREATE TABLE backups.invites_pre_i5            AS SELECT * FROM public.invites;