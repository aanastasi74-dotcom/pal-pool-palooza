-- ============================================================
-- H.1.1 RESET DE PRODUÇÃO
-- ============================================================
TRUNCATE TABLE public.predictions, public.top4_predictions, public.quotas CASCADE;
DELETE FROM public.profiles;

UPDATE public.matches
SET placar_casa = NULL, placar_fora = NULL, status = 'agendado'
WHERE status <> 'agendado' OR placar_casa IS NOT NULL OR placar_fora IS NOT NULL;

-- ============================================================
-- H.1.2 promote_to_admin + auth trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_apelido text;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Email % não encontrado em auth.users. Usuário precisa fazer signup primeiro.', p_email;
  END IF;
  UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id RETURNING apelido INTO v_apelido;
  IF v_apelido IS NULL THEN
    RAISE EXCEPTION 'Profile não encontrado para %. Ele já fez signup completo (com apelido)?', p_email;
  END IF;
  RETURN v_apelido || ' agora é admin';
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_admin(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO postgres;

-- garantir trigger de auto-criação de profile (handle_new_user já existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- H.1.3 UNIQUE apelido
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_apelido_unique;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_apelido_unique UNIQUE (apelido);

-- ============================================================
-- H.1.4 Quota fantasma
-- ============================================================
ALTER TABLE public.quotas ALTER COLUMN numero DROP NOT NULL;

ALTER TABLE public.quotas DROP CONSTRAINT IF EXISTS quotas_status_check;
ALTER TABLE public.quotas
  ADD CONSTRAINT quotas_status_check
  CHECK (status IN ('incompleta', 'aguardando_aprovacao', 'ativa', 'rejeitada', 'expirada'));

CREATE OR REPLACE FUNCTION public.proximo_numero_quota(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM public.quotas
  WHERE user_id = p_user_id
    AND status IN ('aguardando_aprovacao', 'ativa', 'rejeitada');
$$;

CREATE OR REPLACE FUNCTION public.cleanup_quotas_incompletas()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.quotas
    WHERE status = 'incompleta'
      AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*)::integer FROM deleted;
$$;

-- ============================================================
-- H.1.5 Peso por dia da Copa
-- ============================================================
WITH dias AS (
  SELECT DISTINCT DATE(data_jogo AT TIME ZONE 'America/Sao_Paulo') AS d,
         DENSE_RANK() OVER (ORDER BY DATE(data_jogo AT TIME ZONE 'America/Sao_Paulo')) AS num
  FROM public.matches
  WHERE data_jogo IS NOT NULL
)
UPDATE public.matches m
SET peso = 9 + dias.num
FROM dias
WHERE DATE(m.data_jogo AT TIME ZONE 'America/Sao_Paulo') = dias.d;

-- ============================================================
-- H.1.6 Placar 0..20
-- ============================================================
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_placar_casa_check;
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_placar_fora_check;
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_placar_casa_check CHECK (placar_casa IS NULL OR placar_casa BETWEEN 0 AND 20),
  ADD CONSTRAINT predictions_placar_fora_check CHECK (placar_fora IS NULL OR placar_fora BETWEEN 0 AND 20);

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_placar_casa_check;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_placar_fora_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_placar_casa_check CHECK (placar_casa IS NULL OR placar_casa BETWEEN 0 AND 20),
  ADD CONSTRAINT matches_placar_fora_check CHECK (placar_fora IS NULL OR placar_fora BETWEEN 0 AND 20);