-- =========================================================================
-- RODADA E.1 — Schema completo do back-end Bolão dos Perebas
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TABELAS
-- -------------------------------------------------------------------------

-- 1.1 profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  apelido text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'participante' CHECK (role IN ('admin', 'participante')),
  ativo boolean NOT NULL DEFAULT true,
  cor text,
  notificacoes jsonb DEFAULT '{"whatsapp": true, "email": true, "antesDeTravar": true}'::jsonb,
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX profiles_role_ativo_idx ON public.profiles(role) WHERE ativo = true;

-- 1.2 invites
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'usado', 'expirado', 'revogado')),
  enviado_em timestamptz DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em timestamptz,
  criado_por uuid REFERENCES public.profiles ON DELETE SET NULL,
  mensagem text
);
CREATE INDEX invites_token_idx ON public.invites(token);
CREATE INDEX invites_email_idx ON public.invites(email);
CREATE INDEX invites_status_idx ON public.invites(status);

-- 1.3 quotas
CREATE TABLE public.quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  numero int NOT NULL,
  apelido text,
  status text NOT NULL DEFAULT 'aguardando_aprovacao' CHECK (status IN ('ativa', 'aguardando_aprovacao', 'expirada')),
  paga_em timestamptz,
  pontos int DEFAULT 0,
  posicao int,
  palpites_validos int DEFAULT 0,
  palpites_possiveis int DEFAULT 0,
  elegivel_lanterna boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, numero)
);
CREATE INDEX quotas_user_id_idx ON public.quotas(user_id);
CREATE INDEX quotas_status_idx ON public.quotas(status);

-- 1.4 payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_id uuid REFERENCES public.quotas ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL CHECK (valor > 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'estornado')),
  comprovante_path text,
  motivo_rejeicao text,
  aprovado_por uuid REFERENCES public.profiles,
  aprovado_em timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX payments_user_id_idx ON public.payments(user_id);
CREATE INDEX payments_status_idx ON public.payments(status);
CREATE INDEX payments_created_at_idx ON public.payments(created_at DESC);

-- 1.5 matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase text NOT NULL,
  data_jogo timestamptz NOT NULL,
  estadio text,
  cidade text,
  casa text NOT NULL,
  fora text NOT NULL,
  peso int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'ao-vivo', 'encerrado')),
  placar_casa int CHECK (placar_casa >= 0),
  placar_fora int CHECK (placar_fora >= 0),
  travado_em timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX matches_data_jogo_idx ON public.matches(data_jogo);
CREATE INDEX matches_fase_idx ON public.matches(fase);
CREATE INDEX matches_status_idx ON public.matches(status);

-- 1.6 predictions
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_id uuid NOT NULL REFERENCES public.quotas ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches ON DELETE CASCADE,
  placar_casa int CHECK (placar_casa >= 0 AND placar_casa <= 9),
  placar_fora int CHECK (placar_fora >= 0 AND placar_fora <= 9),
  submetido_em timestamptz,
  pontos_calculados int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(quota_id, match_id)
);
CREATE INDEX predictions_quota_id_idx ON public.predictions(quota_id);
CREATE INDEX predictions_match_id_idx ON public.predictions(match_id);

-- 1.7 top4_predictions
CREATE TABLE public.top4_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_id uuid NOT NULL REFERENCES public.quotas ON DELETE CASCADE UNIQUE,
  posicao_1 text,
  posicao_2 text,
  posicao_3 text,
  posicao_4 text,
  alterado_em timestamptz DEFAULT now(),
  fase_alteracao text CHECK (fase_alteracao IN ('antes_copa', 'grupos', 'oitavas', 'quartas', 'semis', 'final'))
);

-- 1.8 personality_profiles
CREATE TABLE public.personality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id uuid REFERENCES public.profiles ON DELETE CASCADE,
  apelido_principal text NOT NULL,
  apelidos_alternativos text[] DEFAULT ARRAY[]::text[],
  tracos jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  observacoes_admin text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX personality_profiles_participante_idx ON public.personality_profiles(participante_id);

-- 1.9 bulletins
CREATE TABLE public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  conteudo_original text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('publicado', 'rascunho', 'agendado')),
  publicado_em timestamptz,
  agendado_para timestamptz,
  publicado_por uuid REFERENCES public.profiles,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX bulletins_data_idx ON public.bulletins(data DESC);
CREATE INDEX bulletins_status_idx ON public.bulletins(status);

-- 1.10 audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_id uuid REFERENCES public.profiles,
  ator_nome text,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX audit_log_created_at_idx ON public.audit_log(created_at DESC);
CREATE INDEX audit_log_ator_id_idx ON public.audit_log(ator_id);

-- 1.11 reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid REFERENCES public.profiles ON DELETE SET NULL,
  autor_nome text,
  descricao text NOT NULL,
  url text,
  user_agent text,
  severidade text NOT NULL CHECK (severidade IN ('critico', 'importante', 'menor')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'resolvido')),
  created_at timestamptz DEFAULT now()
);

-- 1.12 settings
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles
);

-- -------------------------------------------------------------------------
-- 2. FUNÇÃO is_admin() E TRIGGER handle_new_user
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, apelido)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apelido', upper(substring(split_part(NEW.email, '@', 1), 1, 2)))
  );
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------
-- 3. ENABLE RLS (já habilitado por event trigger, mas reforçando)
-- -------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top4_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 4. POLICIES
-- -------------------------------------------------------------------------

-- 4.1 profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.2 invites
CREATE POLICY "invites_select_admin" ON public.invites
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "invites_select_by_token_anon" ON public.invites
  FOR SELECT TO anon USING (true);
CREATE POLICY "invites_insert_admin" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "invites_update_admin" ON public.invites
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "invites_delete_admin" ON public.invites
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.3 quotas
CREATE POLICY "quotas_select_self_or_admin" ON public.quotas
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "quotas_insert_self" ON public.quotas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "quotas_update_self_or_admin" ON public.quotas
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "quotas_delete_admin" ON public.quotas
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.4 payments
CREATE POLICY "payments_select_self_or_admin" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "payments_insert_self" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pendente');
CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "payments_delete_admin" ON public.payments
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.5 matches
CREATE POLICY "matches_select_authenticated" ON public.matches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_insert_admin" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "matches_update_admin" ON public.matches
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "matches_delete_admin" ON public.matches
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.6 predictions
CREATE POLICY "predictions_select_self_or_admin" ON public.predictions
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.quotas q WHERE q.id = predictions.quota_id AND q.user_id = auth.uid()
    )
  );
CREATE POLICY "predictions_insert_self_unlocked" ON public.predictions
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() OR (
      EXISTS (SELECT 1 FROM public.quotas q WHERE q.id = quota_id AND q.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.travado_em IS NULL OR m.travado_em > now()))
    )
  );
CREATE POLICY "predictions_update_self_unlocked" ON public.predictions
  FOR UPDATE TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.quotas q WHERE q.id = predictions.quota_id AND q.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR (
      EXISTS (SELECT 1 FROM public.quotas q WHERE q.id = quota_id AND q.user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.travado_em IS NULL OR m.travado_em > now()))
    )
  );
-- predictions: sem policy de DELETE = ninguém apaga

-- 4.7 top4_predictions
CREATE POLICY "top4_select_self_or_admin" ON public.top4_predictions
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.quotas q WHERE q.id = top4_predictions.quota_id AND q.user_id = auth.uid()
    )
  );
CREATE POLICY "top4_insert_self" ON public.top4_predictions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotas q WHERE q.id = quota_id AND q.user_id = auth.uid())
  );
CREATE POLICY "top4_update_self" ON public.top4_predictions
  FOR UPDATE TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.quotas q WHERE q.id = top4_predictions.quota_id AND q.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.quotas q WHERE q.id = quota_id AND q.user_id = auth.uid()
    )
  );
CREATE POLICY "top4_delete_admin" ON public.top4_predictions
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.8 personality_profiles
CREATE POLICY "personality_select_authenticated" ON public.personality_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "personality_insert_admin" ON public.personality_profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "personality_update_admin" ON public.personality_profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "personality_delete_admin" ON public.personality_profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.9 bulletins
CREATE POLICY "bulletins_select_published_or_admin" ON public.bulletins
  FOR SELECT TO authenticated USING (status = 'publicado' OR public.is_admin());
CREATE POLICY "bulletins_insert_admin" ON public.bulletins
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "bulletins_update_admin" ON public.bulletins
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "bulletins_delete_admin" ON public.bulletins
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.10 audit_log
CREATE POLICY "audit_select_admin" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_insert_self" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (ator_id = auth.uid());
-- sem UPDATE/DELETE policies

-- 4.11 reports
CREATE POLICY "reports_select_admin" ON public.reports
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "reports_insert_self" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());
CREATE POLICY "reports_update_admin" ON public.reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "reports_delete_admin" ON public.reports
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4.12 settings
CREATE POLICY "settings_select_authenticated" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_insert_admin" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "settings_delete_admin" ON public.settings
  FOR DELETE TO authenticated USING (public.is_admin());

-- -------------------------------------------------------------------------
-- 5. STORAGE BUCKET
-- -------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-pix', 'comprovantes-pix', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "comprovantes_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'comprovantes-pix'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "comprovantes_select_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'comprovantes-pix'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
CREATE POLICY "comprovantes_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'comprovantes-pix' AND public.is_admin()
  );

-- -------------------------------------------------------------------------
-- 6. SEED INICIAL — settings
-- -------------------------------------------------------------------------

INSERT INTO public.settings (key, value) VALUES
  ('pix_config', '{"chave": "bolaodosperebas@pix.com", "banco": "Banco da Perebada", "titular": "Bolão dos Perebas", "instrucoes": "Mande o comprovante no app, não no WhatsApp."}'::jsonb),
  ('score_rules', '{"placar_exato": 12, "resultado_certo": 4, "gols_vencedor": 2, "diferenca_gols": 2, "gols_de_um_time": 1}'::jsonb),
  ('peso_progressivo', '{"inicial": 10, "incremento_por_dia": 1, "peso_final": 50}'::jsonb),
  ('top4_windows', '[{"fase": "antes_copa", "eficacia": 100}, {"fase": "grupos", "eficacia": 50}, {"fase": "oitavas", "eficacia": 25}, {"fase": "quartas", "eficacia": 12.5}, {"fase": "semis", "eficacia": 6.25}, {"fase": "final", "eficacia": 0}]'::jsonb),
  ('prize_distribution', '[{"id": "primeiro", "label": "1º lugar", "pct": 60}, {"id": "segundo", "label": "2º lugar", "pct": 25}, {"id": "terceiro", "label": "3º lugar", "pct": 10}, {"id": "lanterna", "label": "Lanterninha", "pct": 5}]'::jsonb),
  ('lanterninha_rule', '{"engajamento_min": 0.8, "pontos_min": 200}'::jsonb),
  ('premio_meta', '{"valor": 5000, "custos_operacionais": 200}'::jsonb),
  ('boletim_config', '{"hora_envio": "22:00", "auto_geracao": true}'::jsonb);