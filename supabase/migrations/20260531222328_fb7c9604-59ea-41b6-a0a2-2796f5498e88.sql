-- Rodada N.4 — URL pública para emails + backup do lembretes_enviados

-- Backup defensivo da tabela lembretes_enviados
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.lembretes_enviados_pre_n4 AS
  SELECT * FROM public.lembretes_enviados;

-- Setting com a URL pública canônica do app (fonte única)
INSERT INTO public.settings (key, value, updated_at)
VALUES ('app_url_publico', to_jsonb('https://pal-pool-palooza.lovable.app'::text), now())
ON CONFLICT (key) DO NOTHING;
