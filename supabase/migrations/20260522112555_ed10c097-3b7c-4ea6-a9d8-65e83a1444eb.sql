
-- Backups
CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.matches_pre_m1;
CREATE TABLE backups.matches_pre_m1 AS TABLE public.matches;
DROP TABLE IF EXISTS backups.teams_pre_m1;
CREATE TABLE backups.teams_pre_m1 AS TABLE public.teams;

-- teams.codigo_api
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS codigo_api integer;
CREATE UNIQUE INDEX IF NOT EXISTS teams_codigo_api_unique ON public.teams (codigo_api) WHERE codigo_api IS NOT NULL;

-- settings
INSERT INTO public.settings (key, value) VALUES
  ('sync_season', '"2022"'::jsonb),
  ('sync_ativo', 'false'::jsonb),
  ('sync_modo', '"shadow"'::jsonb),
  ('sync_modo_teste', 'true'::jsonb),
  ('sync_ultima_execucao', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- sync_logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  modo text NOT NULL,
  season text,
  jogos_verificados integer DEFAULT 0,
  jogos_atualizados integer DEFAULT 0,
  chamadas_api integer DEFAULT 0,
  duracao_ms integer DEFAULT 0,
  erro text,
  detalhe jsonb
);
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_logs_select_admin ON public.sync_logs;
CREATE POLICY sync_logs_select_admin ON public.sync_logs FOR SELECT TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS sync_logs_executado_em_idx ON public.sync_logs (executado_em DESC);
