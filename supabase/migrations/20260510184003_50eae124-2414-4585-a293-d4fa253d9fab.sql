-- 0.1 is_admin reconhece service_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    (auth.role() = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND ativo = true
    )
$$;

-- 0.2 consume_invite SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.consume_invite(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.invites
  SET status = 'usado', usado_em = now()
  WHERE token = p_token
    AND status = 'pendente'
    AND expira_em > now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END $$;

GRANT EXECUTE ON FUNCTION public.consume_invite(text) TO authenticated;

-- 0.4 fase_atual_copa
CREATE OR REPLACE FUNCTION public.fase_atual_copa()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM matches WHERE travado_em IS NOT NULL AND travado_em <= now()) THEN 'antes_copa'
    WHEN EXISTS (SELECT 1 FROM matches WHERE fase = 'Final' AND status = 'encerrado') THEN 'final'
    WHEN EXISTS (SELECT 1 FROM matches WHERE fase IN ('Semifinal', 'Disputa de terceiro') AND travado_em <= now()) THEN 'semis'
    WHEN EXISTS (SELECT 1 FROM matches WHERE fase = 'Quartas' AND travado_em <= now()) THEN 'quartas'
    WHEN EXISTS (SELECT 1 FROM matches WHERE fase = 'Oitavas' AND travado_em <= now()) THEN 'oitavas'
    WHEN EXISTS (SELECT 1 FROM matches WHERE fase = 'Round of 32' AND travado_em <= now()) THEN 'round_32'
    ELSE 'grupos'
  END
$$;

GRANT EXECUTE ON FUNCTION public.fase_atual_copa() TO authenticated, anon;

-- protect_top4_fields atualizado
CREATE OR REPLACE FUNCTION public.protect_top4_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fase text;
BEGIN
  IF NOT public.is_admin() THEN
    NEW.quota_id := OLD.quota_id;
    IF (NEW.posicao_1 IS DISTINCT FROM OLD.posicao_1)
       OR (NEW.posicao_2 IS DISTINCT FROM OLD.posicao_2)
       OR (NEW.posicao_3 IS DISTINCT FROM OLD.posicao_3)
       OR (NEW.posicao_4 IS DISTINCT FROM OLD.posicao_4) THEN
      v_fase := public.fase_atual_copa();
      IF v_fase IN ('oitavas', 'quartas', 'semis', 'final') THEN
        RAISE EXCEPTION 'Top 4 não pode mais ser alterado: a janela fechou após o Round of 32';
      END IF;
      NEW.alterado_em := now();
      NEW.fase_alteracao := v_fase;
    ELSE
      NEW.alterado_em := OLD.alterado_em;
      NEW.fase_alteracao := OLD.fase_alteracao;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- RPCs admin para toggles em profiles
CREATE OR REPLACE FUNCTION public.admin_set_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode alterar role';
  END IF;
  IF p_role NOT IN ('admin', 'participante') THEN
    RAISE EXCEPTION 'role inválido';
  END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_ativo(p_user_id uuid, p_ativo boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode alterar ativo';
  END IF;
  UPDATE public.profiles SET ativo = p_ativo WHERE id = p_user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_ativo(uuid, boolean) TO authenticated;

-- Settings padrões
INSERT INTO public.settings (key, value)
VALUES (
  'top4_windows',
  '[
    {"fase": "antes_copa", "label": "Antes da Copa", "eficacia": 100, "max_pontos": 4000, "bloqueada": false},
    {"fase": "grupos",     "label": "Fase de grupos", "eficacia": 50,  "max_pontos": 2000, "bloqueada": false},
    {"fase": "round_32",   "label": "Round of 32",   "eficacia": 25,  "max_pontos": 1000, "bloqueada": false},
    {"fase": "oitavas",    "label": "Oitavas",       "eficacia": 0,   "max_pontos": 0,    "bloqueada": true},
    {"fase": "quartas",    "label": "Quartas",       "eficacia": 0,   "max_pontos": 0,    "bloqueada": true},
    {"fase": "semis",      "label": "Semis",         "eficacia": 0,   "max_pontos": 0,    "bloqueada": true},
    {"fase": "final",      "label": "Final",         "eficacia": 0,   "max_pontos": 0,    "bloqueada": true}
  ]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.settings (key, value)
VALUES (
  'maintenance_mode',
  '{"read_only": false, "total": false, "auto_backup": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value)
VALUES (
  'pix_config',
  '{"chave": "perebas@bolao.com.br", "valor_quota": 50, "titular": "Bolão dos Perebas"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value)
VALUES (
  'prize_distribution',
  '{"meta_arrecadacao": 5000, "custos": 200, "campeao_pct": 50, "vice_pct": 25, "terceiro_pct": 15, "lanterninha_pct": 10}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Storage bucket: limites de tamanho e MIME
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
WHERE id = 'comprovantes-pix';

-- Storage policies (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'comprovantes_insert_own'
  ) THEN
    CREATE POLICY "comprovantes_insert_own" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'comprovantes-pix'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'comprovantes_select_own_or_admin'
  ) THEN
    CREATE POLICY "comprovantes_select_own_or_admin" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'comprovantes-pix'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin()
        )
      );
  END IF;
END $$;
