-- Backup defensivo
CREATE SCHEMA IF NOT EXISTS backups;
CREATE TABLE IF NOT EXISTS backups.settings_pre_l1 AS SELECT * FROM public.settings;

-- Tabela de boletins gerados (nova, separada de bulletins)
CREATE TABLE IF NOT EXISTS public.boletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia date NOT NULL UNIQUE,
  rascunho_md text,
  publicado_md text,
  status text NOT NULL DEFAULT 'pendente_revisao'
    CHECK (status IN ('pendente_revisao', 'publicado', 'arquivado')),
  modelo_usado text,
  tokens_input integer,
  tokens_output integer,
  publicado_em timestamptz,
  publicado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boletins_data_ref ON public.boletins(data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_boletins_status ON public.boletins(status);

ALTER TABLE public.boletins ENABLE ROW LEVEL SECURITY;

CREATE POLICY boletins_select_publicado ON public.boletins FOR SELECT
  TO authenticated
  USING (status = 'publicado' OR is_admin());

CREATE POLICY boletins_admin_all ON public.boletins FOR ALL
  TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.boletins_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_boletins_updated_at ON public.boletins;
CREATE TRIGGER trg_boletins_updated_at
BEFORE UPDATE ON public.boletins
FOR EACH ROW EXECUTE FUNCTION public.boletins_set_updated_at();

-- Tabela de perfis de personalidade
CREATE TABLE IF NOT EXISTS public.perfis_personalidade (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  descricao text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.perfis_personalidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfis_personalidade_admin_only ON public.perfis_personalidade FOR ALL
  TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Settings keys (não sobrescreve se já existirem)
INSERT INTO public.settings (key, value) VALUES
  ('boletim_modelo', '"claude-sonnet-4-6"'::jsonb),
  ('boletim_max_tokens', '1500'::jsonb),
  ('boletim_temperature', '0.8'::jsonb),
  ('boletim_system_prompt', '"Você é um cronista esportivo zoeiro do Bolão dos Perebas Copa 2026, um bolão entre amigos pra Copa do Mundo FIFA 2026. Seu tom é irreverente, sarcástico, brasileiro, lembra os melhores grupos de WhatsApp entre amigos comentando futebol. Foco em zoeira leve, observação engraçada, comentário sagaz sobre o futebol.\n\nEstilo:\n- ~250-400 palavras\n- Tom: irreverente, divertido, brasileiro\n- Linguagem coloquial, com gírias suaves (sem chulo)\n- Estrutura solta, parágrafos curtos\n- Comece com Boletim do dia DD/MM/26\n- Pode usar emojis moderadamente (1-2 por parágrafo)\n\nEVITE:\n- Conteúdo ofensivo (raça, gênero, religião, política)\n- Zoeira pessoal cruel (ataques diretos, humilhação)\n- Repetir estruturas\n- Termos técnicos do app\n\nINCLUA quando aplicável:\n- Resumo dos jogos do dia com placar\n- Quem pontuou bem e quem foi mal\n- Palpites do louco se houver\n- Prévia dos jogos da madrugada com zoeira (jogos chatos, dormir, etc.)\n- Apelo à torcida (vamos lá, perebas)\n- Se algum pereba tem perfil de personalidade descrito, use pra personalizar zoeira com ele"'::jsonb)
ON CONFLICT (key) DO NOTHING;