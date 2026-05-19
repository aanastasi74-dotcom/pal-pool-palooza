
CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE IF NOT EXISTS backups.profiles_pre_l3 AS
  SELECT id, notificacoes FROM profiles;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS recebe_lembretes_email boolean NOT NULL DEFAULT true;

UPDATE profiles
  SET recebe_lembretes_email = COALESCE((notificacoes->>'whatsapp')::boolean, (notificacoes->>'email')::boolean, true);

COMMENT ON COLUMN profiles.recebe_lembretes_email IS
  'Toggle para receber lembretes por email (pré-Copa e durante a Copa). Migrado de notificacoes->whatsapp em L.3.';

CREATE TABLE IF NOT EXISTS public.lembretes_enviados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  data_referencia date NOT NULL,
  enviado_em timestamptz DEFAULT now(),
  status text DEFAULT 'enviado',
  erro text,
  UNIQUE (profile_id, tipo, data_referencia)
);

CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_profile ON lembretes_enviados(profile_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_data ON lembretes_enviados(data_referencia DESC);

ALTER TABLE public.lembretes_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY lembretes_enviados_admin_all ON public.lembretes_enviados
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO settings (key, value) VALUES
  ('copa_data_inicio', '"2026-06-11"'::jsonb),
  ('lembrete_pre_copa_marcos', '[14, 7, 3, 2, 1]'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_perebas_com_palpite_faltante(p_data_alvo date)
RETURNS TABLE (
  id uuid,
  nome text,
  apelido text,
  email text,
  recebe_lembretes_email boolean,
  palpites_faltantes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH jogos_alvo AS (
    SELECT m.id
    FROM matches m
    WHERE (m.data_jogo AT TIME ZONE 'America/Sao_Paulo')::date = p_data_alvo
      AND m.status = 'agendado'
  ),
  quotas_x_jogos AS (
    SELECT q.id AS quota_id, q.user_id, ja.id AS match_id
    FROM quotas q
    CROSS JOIN jogos_alvo ja
    WHERE q.status = 'ativa'
  ),
  faltantes AS (
    SELECT qxj.user_id, count(*) AS palpites_faltantes
    FROM quotas_x_jogos qxj
    LEFT JOIN predictions pr ON pr.quota_id = qxj.quota_id AND pr.match_id = qxj.match_id
    WHERE pr.placar_casa IS NULL OR pr.placar_fora IS NULL OR pr.submetido_em IS NULL
    GROUP BY qxj.user_id
    HAVING count(*) > 0
  )
  SELECT p.id, p.nome, p.apelido, p.email, p.recebe_lembretes_email, f.palpites_faltantes::integer
  FROM faltantes f
  JOIN profiles p ON p.id = f.user_id
  WHERE p.recebe_lembretes_email = true
    AND p.ativo = true
  ORDER BY p.apelido;
$$;

GRANT EXECUTE ON FUNCTION public.get_perebas_com_palpite_faltante(date) TO authenticated, service_role;
