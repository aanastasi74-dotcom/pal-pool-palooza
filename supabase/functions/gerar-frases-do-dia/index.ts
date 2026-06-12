// Edge function: gerar-frases-do-dia
// POST { data_referencia?: 'YYYY-MM-DD', force_regenerate?: boolean }
// Cron: 0 9 * * * UTC (= 6h BRT)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_FRASES = [
  "Mais um dia de Copa, perebada.",
  "Bola vai rolar, prepara o coração.",
  "Cervejinha gelada e fé no palpite.",
  "Quem palpitou empate hoje, força.",
  "Bolão tá tinindo, confere teus pontos.",
];
const ALVO_FRASES = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sb(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  if (r.status === 204) return null;
  return r.json();
}

async function rpc(name: string, args: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });
  if (!r.ok) throw new Error(`rpc ${name}: ${r.status} ${await r.text()}`);
  return r.json();
}

function getTodayBRT(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function brtDayBounds(dataRef: string) {
  const startISO = `${dataRef}T03:00:00.000Z`;
  const d = new Date(`${dataRef}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const endISO = `${d.toISOString().slice(0, 10)}T03:00:00.000Z`;
  return { startISO, endISO };
}

function prevDayBRT(dataRef: string): string {
  const d = new Date(`${dataRef}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function fetchSettings() {
  const rows = await sb(
    `settings?key=in.(frases_do_dia_modelo,frases_do_dia_max_tokens,frases_do_dia_temperature,frases_do_dia_system_prompt)&select=key,value`,
  );
  const map: Record<string, any> = {};
  for (const r of rows ?? []) map[r.key] = r.value;
  return {
    modelo: map.frases_do_dia_modelo ?? "claude-sonnet-4-6",
    max_tokens: map.frases_do_dia_max_tokens ?? 500,
    temperature: map.frases_do_dia_temperature ?? 0.9,
    system_prompt:
      map.frases_do_dia_system_prompt ??
      "Você é um cronista esportivo zoeiro. Retorne JSON: {\"frases\":[\"a\",\"b\",\"c\"]}",
  };
}

function montarPrompt(ctx: any): string {
  const linhas: string[] = [];
  linhas.push(`Data de hoje (BRT): ${ctx.dataRef}`);
  linhas.push("");
  linhas.push("## Jogos de ontem (encerrados)");
  if (!ctx.jogosOntem.length) linhas.push("- (nenhum)");
  else
    for (const j of ctx.jogosOntem) {
      linhas.push(`- ${j.casa} ${j.placar_casa ?? "?"} x ${j.placar_fora ?? "?"} ${j.fora} — ${j.fase}`);
    }
  linhas.push("");
  linhas.push("## Jogos de hoje");
  if (!ctx.jogosHoje.length) linhas.push("- (nenhum)");
  else
    for (const j of ctx.jogosHoje) {
      const hora = new Date(j.data_jogo).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });
      linhas.push(`- ${hora} BRT: ${j.casa} x ${j.fora} — ${j.fase}${j.estadio ? ` (${j.estadio})` : ""}`);
    }
  if (ctx.top3?.length) {
    linhas.push("");
    linhas.push("## Top 3 do ranking");
    for (const r of ctx.top3) {
      linhas.push(`- ${r.posicao}º ${r.apelido ?? r.nome} — ${r.pontos} pts`);
    }
  }
  linhas.push("");
  linhas.push(
    'Gere 5 frases curtas seguindo seu estilo. Retorne SOMENTE JSON no formato: {"frases":["frase1","frase2","frase3","frase4","frase5"]}',
  );
  return linhas.join("\n");
}

function parseFrases(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.frases)) return parsed.frases.map(String);
  } catch (_) { /* try regex */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed?.frases)) return parsed.frases.map(String);
    } catch (_) { /* ignore */ }
  }
  return null;
}

function normalize3(frases: string[]): string[] {
  const arr = frases.filter((f) => f && f.trim().length > 0).slice(0, 3);
  while (arr.length < 3) arr.push(FALLBACK_FRASES[arr.length]);
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dataRef: string = body.data_referencia ?? getTodayBRT();
    const forceRegenerate: boolean = body.force_regenerate ?? false;

    const existing = await sb(`frases_do_dia?data=eq.${dataRef}&select=*`);
    if (existing.length > 0 && !forceRegenerate) {
      return json({ ok: true, skipped: true, motivo: "frases já geradas pra essa data", data: dataRef });
    }

    // Contexto
    const ontem = prevDayBRT(dataRef);
    const { startISO: oStart, endISO: oEnd } = brtDayBounds(ontem);
    const { startISO: hStart, endISO: hEnd } = brtDayBounds(dataRef);

    const [jogosOntem, jogosHoje] = await Promise.all([
      sb(`matches?status=eq.encerrado&data_jogo=gte.${oStart}&data_jogo=lt.${oEnd}&select=*&order=data_jogo.asc`),
      sb(`matches?data_jogo=gte.${hStart}&data_jogo=lt.${hEnd}&select=*&order=data_jogo.asc`),
    ]);

    let top3: any[] = [];
    try {
      const ranking = (await rpc("get_ranking_geral", {})) as any[];
      top3 = (ranking ?? []).slice(0, 3);
    } catch (_) { /* opcional */ }

    let frasesGeradas: string[] | null = null;
    let modeloUsado = "fallback";
    let tokensInput = 0;
    let tokensOutput = 0;
    let errMsg: string | null = null;

    if (ANTHROPIC_API_KEY) {
      try {
        const cfg = await fetchSettings();
        const userPrompt = montarPrompt({
          dataRef,
          jogosOntem: jogosOntem ?? [],
          jogosHoje: jogosHoje ?? [],
          top3,
        });
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: cfg.modelo,
            max_tokens: cfg.max_tokens,
            temperature: cfg.temperature,
            system: cfg.system_prompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
        const data = await resp.json();
        const text = data.content?.[0]?.text ?? "";
        tokensInput = data.usage?.input_tokens ?? 0;
        tokensOutput = data.usage?.output_tokens ?? 0;
        modeloUsado = cfg.modelo;
        const parsed = parseFrases(text);
        if (!parsed) throw new Error(`Resposta sem JSON válido: ${text.slice(0, 200)}`);
        frasesGeradas = parsed;
      } catch (e) {
        errMsg = (e as Error).message;
        console.error("gerar-frases-do-dia anthropic error:", errMsg);
      }
    } else {
      errMsg = "ANTHROPIC_API_KEY não configurada";
    }

    const frases = normalize3(frasesGeradas ?? FALLBACK_FRASES);

    const payload = {
      data: dataRef,
      frases,
      modelo_usado: modeloUsado,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      gerado_em: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await sb(`frases_do_dia?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await sb(`frases_do_dia`, { method: "POST", body: JSON.stringify(payload) });
    }

    try {
      await sb(`audit_log`, {
        method: "POST",
        body: JSON.stringify({
          acao: "gerou_frases_do_dia",
          entidade: "frases_do_dia",
          entidade_id: dataRef,
          ator_nome: "sistema",
          payload: { tokens_input: tokensInput, tokens_output: tokensOutput, modelo: modeloUsado, erro: errMsg },
        }),
      });
    } catch (_) { /* ignore */ }

    return json({
      ok: true,
      data: dataRef,
      frases,
      modelo: modeloUsado,
      tokens: { input: tokensInput, output: tokensOutput },
      erro: errMsg,
    });
  } catch (e) {
    console.error("gerar-frases-do-dia error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
