-- 2.1 protect profiles
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.ativo := OLD.ativo;
    NEW.email := OLD.email;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_protect_fields ON public.profiles;
CREATE TRIGGER profiles_protect_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;

-- 2.2 protect quotas
CREATE OR REPLACE FUNCTION public.protect_quota_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.user_id := OLD.user_id;
    NEW.numero := OLD.numero;
    NEW.status := OLD.status;
    NEW.paga_em := OLD.paga_em;
    NEW.pontos := OLD.pontos;
    NEW.posicao := OLD.posicao;
    NEW.palpites_validos := OLD.palpites_validos;
    NEW.palpites_possiveis := OLD.palpites_possiveis;
    NEW.elegivel_lanterna := OLD.elegivel_lanterna;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quotas_protect_fields ON public.quotas;
CREATE TRIGGER quotas_protect_fields
BEFORE UPDATE ON public.quotas
FOR EACH ROW EXECUTE FUNCTION public.protect_quota_fields();

REVOKE EXECUTE ON FUNCTION public.protect_quota_fields() FROM PUBLIC, anon, authenticated;

-- 2.3 protect predictions
CREATE OR REPLACE FUNCTION public.protect_prediction_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.quota_id := OLD.quota_id;
    NEW.match_id := OLD.match_id;
    NEW.pontos_calculados := OLD.pontos_calculados;
    NEW.created_at := OLD.created_at;
    IF (NEW.placar_casa IS DISTINCT FROM OLD.placar_casa) OR (NEW.placar_fora IS DISTINCT FROM OLD.placar_fora) THEN
      NEW.submetido_em := now();
    ELSE
      NEW.submetido_em := OLD.submetido_em;
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS predictions_protect_fields ON public.predictions;
CREATE TRIGGER predictions_protect_fields
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.protect_prediction_fields();

REVOKE EXECUTE ON FUNCTION public.protect_prediction_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_prediction_submetido_em_on_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.placar_casa IS NOT NULL AND NEW.placar_fora IS NOT NULL THEN
    NEW.submetido_em := now();
  ELSE
    NEW.submetido_em := NULL;
  END IF;
  NEW.pontos_calculados := 0;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS predictions_set_submetido_em ON public.predictions;
CREATE TRIGGER predictions_set_submetido_em
BEFORE INSERT ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.set_prediction_submetido_em_on_insert();

-- 2.4 protect top4_predictions
CREATE OR REPLACE FUNCTION public.protect_top4_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.quota_id := OLD.quota_id;
    IF (NEW.posicao_1 IS DISTINCT FROM OLD.posicao_1)
       OR (NEW.posicao_2 IS DISTINCT FROM OLD.posicao_2)
       OR (NEW.posicao_3 IS DISTINCT FROM OLD.posicao_3)
       OR (NEW.posicao_4 IS DISTINCT FROM OLD.posicao_4) THEN
      NEW.alterado_em := now();
      NEW.fase_alteracao := 'grupos';
    ELSE
      NEW.alterado_em := OLD.alterado_em;
      NEW.fase_alteracao := OLD.fase_alteracao;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS top4_protect_fields ON public.top4_predictions;
CREATE TRIGGER top4_protect_fields
BEFORE UPDATE ON public.top4_predictions
FOR EACH ROW EXECUTE FUNCTION public.protect_top4_fields();

REVOKE EXECUTE ON FUNCTION public.protect_top4_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_top4_fase_on_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.alterado_em := now();
  NEW.fase_alteracao := 'antes_copa';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS top4_set_fase_on_insert ON public.top4_predictions;
CREATE TRIGGER top4_set_fase_on_insert
BEFORE INSERT ON public.top4_predictions
FOR EACH ROW EXECUTE FUNCTION public.set_top4_fase_on_insert();

-- 3. invites: remover acesso anon e criar function
DROP POLICY IF EXISTS "invites_select_by_token_anon" ON public.invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  nome text,
  status text,
  expira_em timestamptz,
  mensagem text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, email, nome, status, expira_em, mensagem
  FROM public.invites
  WHERE token = p_token
    AND status = 'pendente'
    AND expira_em > now()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- 4. visibilidade de palpites
DROP POLICY IF EXISTS "predictions_select_self_or_admin" ON public.predictions;

CREATE POLICY "predictions_select_self_or_locked" ON public.predictions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quotas q
      WHERE q.id = predictions.quota_id AND q.user_id = auth.uid()
    )
    OR (
      submetido_em IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = predictions.match_id
          AND m.travado_em IS NOT NULL
          AND m.travado_em <= now()
      )
    )
  );

DROP POLICY IF EXISTS "top4_select_self_or_admin" ON public.top4_predictions;

CREATE POLICY "top4_select_self" ON public.top4_predictions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quotas q
      WHERE q.id = top4_predictions.quota_id AND q.user_id = auth.uid()
    )
  );