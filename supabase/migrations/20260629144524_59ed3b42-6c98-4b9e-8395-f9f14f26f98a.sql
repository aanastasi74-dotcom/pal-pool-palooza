CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.settings_pre_fix_boletim;
CREATE TABLE backups.settings_pre_fix_boletim AS
SELECT key, value, now() AS backup_em
FROM settings
WHERE key IN ('boletim_max_tokens','boletim_system_prompt','boletim_modelo','boletim_config','boletim_temperature');