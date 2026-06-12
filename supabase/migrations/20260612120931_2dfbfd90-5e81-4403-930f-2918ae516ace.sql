
CREATE TABLE IF NOT EXISTS public.frases_do_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  frases text[] NOT NULL,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  modelo_usado text,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.frases_do_dia TO anon;
GRANT SELECT ON public.frases_do_dia TO authenticated;
GRANT ALL ON public.frases_do_dia TO service_role;

ALTER TABLE public.frases_do_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frases_do_dia_select_all"
ON public.frases_do_dia FOR SELECT
USING (true);

CREATE POLICY "frases_do_dia_insert_service"
ON public.frases_do_dia FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "frases_do_dia_update_service"
ON public.frases_do_dia FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

INSERT INTO public.settings (key, value) VALUES
  ('frases_do_dia_modelo', '"claude-sonnet-4-5"'::jsonb),
  ('frases_do_dia_max_tokens', '500'::jsonb),
  ('frases_do_dia_temperature', '0.9'::jsonb),
  ('frases_do_dia_system_prompt',
   '"Você é o mesmo cronista esportivo zoeiro do Bolão dos Perebas Copa 2026 que escreve o boletim diário. Seu trabalho aqui é gerar 3 frases curtas (cada uma com 15-25 palavras, máximo 30) pra rodar num carrossel pequeno da tela inicial do app. Cada frase deve ser standalone (sem dependência das outras), contextual ao dia (pode citar jogos de ontem com placar e jogos de hoje com hora). Tom irreverente brasileiro, levemente sarcástico, como um amigo zoeiro comentando no grupo de WhatsApp. Não use markdown, no máximo 1 emoji por frase (se acrescentar humor). As 3 frases devem ser distintas em ângulo: por exemplo, uma sobre o que rolou ontem, uma sobre o que vai rolar hoje, e uma piada/observação geral. Se for dia de jogo do Brasil, dá pra ser mais inflamado. Se algum perfil de pereba é destacado no contexto, pode citar com sarcasmo carinhoso. Retorne SOMENTE um JSON válido no formato exato: {\"frases\": [\"frase 1\", \"frase 2\", \"frase 3\"]}. Nada antes ou depois do JSON."'::jsonb)
ON CONFLICT (key) DO NOTHING;
