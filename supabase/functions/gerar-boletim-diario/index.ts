// Edge function: gerar-boletim-diario
// POST { data_referencia?: 'YYYY-MM-DD', force_regenerate?: boolean }
// Cron: 0 1 * * * UTC (= 22h BRT do dia)
// Usa Anthropic Claude pra gerar boletim com base nos jogos/ranking/perfis.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function brtDayBounds(dataRef: string): { startISO: string; endISO: string } {
  // dataRef em BRT (UTC-3). Início = 00:00 BRT = 03:00 UTC. Fim = 23:59:59 BRT = +1d 02:59:59 UTC.
  const startISO = `${dataRef}T03:00:00.000Z`;
  const d = new Date(`${dataRef}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const next = d.toISOString().slice(0, 10);
  const endISO = `${next}T03:00:00.000Z`;
  return { startISO, endISO };
}

function nextDayBRT(dataRef: string): string {
  const d = new Date(`${dataRef}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function fetchSettings() {
  const rows = await sb(
    `settings?key=in.(boletim_modelo,boletim_max_tokens,boletim_temperature,boletim_system_prompt)&select=key,value`,
  );
  const map: Record<string, any> = {};
  for (const r of rows ?? []) map[r.key] = r.value;
  return {
    modelo: map.boletim_modelo ?? "claude-sonnet-4-6",
    max_tokens: map.boletim_max_tokens ?? 1500,
    temperature: map.boletim_temperature ?? 0.8,
    system_prompt: map.boletim_system_prompt ?? "Você é um cronista esportivo zoeiro.",
  };
}

function montarPrompt(ctx: any): string {
  const linhas: string[] = [];
  linhas.push(`Data de referência (BRT): ${ctx.dataRef}`);
  linhas.push("");
  linhas.push("## Jogos encerrados hoje");
  if (!ctx.jogosEncerrados.length) {
    linhas.push("- (nenhum)");
  } else {
    for (const j of ctx.jogosEncerrados) {
      linhas.push(
        `- ${j.casa} ${j.placar_casa ?? "?"} x ${j.placar_fora ?? "?"} ${j.fora} — ${j.fase} ${j.estadio ? `(${j.estadio})` : ""}`,
      );
    }
  }
  linhas.push("");
  linhas.push("## Jogos da madrugada/amanhã");
  if (!ctx.jogosAmanha.length) {
    linhas.push("- (nenhum)");
  } else {
    for (const j of ctx.jogosAmanha) {
      const hora = new Date(j.data_jogo).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      linhas.push(`- ${hora}: ${j.casa} x ${j.fora} — ${j.fase}`);
    }
  }
  linhas.push("");
  linhas.push("## Top 10 do ranking");
  for (const r of ctx.top10) {
    linhas.push(`- ${r.posicao}º ${r.apelido ?? r.nome} (#${r.numero}) — ${r.pontos} pts`);
  }
  linhas.push("");
  linhas.push("## Lanterninhas (perebas no fundo do ranking — pode ter empate)");
  for (const r of ctx.bottomDinamico) {
    linhas.push(`- ${r.posicao}º ${r.apelido ?? r.nome} (#${r.numero}) — ${r.pontos} pts`);
  }
  linhas.push("");
  linhas.push(`## Profetas do dia (placar exato — CITAR TODOS, SEM EXCEÇÃO)`);
  linhas.push(`Total: ${ctx.profetasExatos.length} profetas com placar exato hoje.`);
  if (!ctx.profetasExatos.length) {
    linhas.push("- (nenhum profeta hoje)");
  } else {
    for (const p of ctx.profetasExatos) {
      const pos = p.posicao_ranking ? `#${p.posicao_ranking} no ranking` : "sem posição";
      const ptsTot = p.pontos_totais != null ? `, ${p.pontos_totais} pts` : "";
      linhas.push(
        `- @${p.apelido ?? p.nome} (quota #${p.numero}) — ${p.jogo} ${p.placar_casa}×${p.placar_fora} [${pos}${ptsTot}]`,
      );
    }
  }
  if (ctx.perfis.length) {
    linhas.push("");
    linhas.push("## Perfis de personalidade da perebada");
    for (const p of ctx.perfis) {
      linhas.push(`- ${p.apelido ?? p.nome}: ${p.descricao}`);
    }
  }
  if (ctx.boletinsAnteriores?.length) {
    linhas.push("");
    linhas.push("## Boletins anteriores (pra evitar repetir piadas e construir continuidade)");
    for (const b of ctx.boletinsAnteriores) {
      const dataBr = new Date(b.data_referencia + "T12:00:00Z")
        .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      linhas.push("");
      linhas.push(`### Boletim de ${dataBr}`);
      linhas.push(b.publicado_md);
    }
  }
  linhas.push("");
  linhas.push(
    "Gere agora o boletim do dia em markdown, seguindo seu estilo. Comece com 'Boletim do dia DD/MM/26' (use a data atual). Use os fatos fornecidos, mas escreva com tom de zoeira/cronista. Construa continuidade com os boletins anteriores quando fizer sentido (CRISÃO segue líder pelo Nº dia? PATPEN ainda na lanterna? alguém em ascensão? alguém em queda livre?) MAS evite repetir as mesmas piadas e ângulos que já apareceram antes. Personagens recorrentes (Carla, perebas com perfil descrito) podem evoluir narrativamente.",
  );
  linhas.push("");
  linhas.push("INSTRUÇÃO IMPORTANTE — PROFETAS:");
  linhas.push("Cite TODOS os apelidos listados na seção 'Profetas do dia'. NENHUM pereba pode ficar de fora — perebada gosta de ser citada e omissão gera chateação.");
  linhas.push("Estratégia obrigatória:");
  linhas.push("- Destaque nominalmente com narrativa curta (1-2 frases por pereba) APENAS 5 a 7 profetas.");
  linhas.push("  Critérios de escolha dos destaques: líderes do ranking, comebacks notáveis (perebas de baixa posição que acertaram), casos engraçados ou recorrentes (perebas que aparecem em boletins anteriores), múltiplos acertos no dia (pereba que cravou 2+ jogos).");
  linhas.push("- Os DEMAIS profetas entram em UMA lista compacta ao final da seção, formato:");
  linhas.push("  'E ainda cravaram: @X (jogo1), @Y (jogo2), @Z (jogo1 + jogo2), ...'");
  linhas.push("  Nenhum pereba pode ficar de fora. TODOS os apelidos da lista de exatos acima devem aparecer.");
  linhas.push("- Não crie subseção separada de 'quase-profetas' — a seção é única, só profetas exatos.");
  linhas.push("- Máximo 7 destaques narrados. Resto em lista compacta.");
  linhas.push("");
  linhas.push("INSTRUÇÃO IMPORTANTE — LANTERNINHAS:");
  linhas.push("Cite TODOS os perebas listados na seção 'Lanterninhas'. Mesma lógica: 1-2 destaques narrados, resto em lista compacta.");
  return linhas.join("\n");
}

import { requireCronOrAdmin } from "../_shared/require-cron-or-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireCronOrAdmin(req);
  if (!auth.ok) return auth.res;




  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dataRef: string = body.data_referencia ?? getTodayBRT();
    const forceRegenerate: boolean = body.force_regenerate ?? false;

    // 1. Boletim existente?
    const existing = await sb(`boletins?data_referencia=eq.${dataRef}&tipo=eq.regular&select=*`);
    if (existing.length > 0 && existing[0].status === "publicado" && !forceRegenerate) {
      return json({ ok: true, skipped: true, motivo: "boletim já publicado", boletim_id: existing[0].id });
    }
    if (existing.length > 0 && !forceRegenerate) {
      return json({ ok: true, skipped: true, motivo: "boletim já existe (rascunho)", boletim_id: existing[0].id });
    }

    // 2. Contexto
    const { startISO, endISO } = brtDayBounds(dataRef);
    const amanha = nextDayBRT(dataRef);
    const { startISO: amaStart, endISO: amaEnd } = brtDayBounds(amanha);

    const [jogosEncerrados, jogosAmanha] = await Promise.all([
      sb(
        `matches?status=eq.encerrado&data_jogo=gte.${startISO}&data_jogo=lt.${endISO}&select=*&order=data_jogo.asc`,
      ),
      sb(
        `matches?status=eq.agendado&data_jogo=gte.${amaStart}&data_jogo=lt.${amaEnd}&select=*&order=data_jogo.asc`,
      ),
    ]);

    // Sem jogos encerrados → não chama API
    if ((jogosEncerrados?.length ?? 0) === 0) {
      return json({ ok: true, skipped: true, motivo: "sem jogos encerrados hoje" });
    }

    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ANTHROPIC_API_KEY não configurada no ambiente" }, 500);
    }

    const ranking = (await rpc("get_ranking_geral", {})) as any[];
    const top10 = ranking.slice(0, 10);

    // Bottom dinâmico: pega todos perebas com pontuação <= pior + tolerância (mín 5, máx 15)
    function calcularBottom(rk: any[]) {
      if (!rk.length) return [];
      const pior = rk[rk.length - 1].pontos;
      const tolerancia = 50;
      let b = rk.filter((r: any) => r.pontos <= pior + tolerancia);
      if (b.length < 5) b = rk.slice(-5);
      else if (b.length > 15) b = b.slice(0, 15);
      return b;
    }
    const bottomDinamico = calcularBottom(ranking);

    // Mapa user_id → posição no ranking (pra enriquecer profetas)
    const rankPosMap = new Map<string, { posicao: number; pontos: number }>();
    for (const r of ranking) {
      if (r.user_id) rankPosMap.set(r.user_id, { posicao: r.posicao, pontos: r.pontos });
    }

    // Perfis com descrição
    const perfisRows = await sb(
      `perfis_personalidade?descricao=not.is.null&select=profile_id,descricao`,
    );
    const profileIds = (perfisRows ?? []).map((p: any) => p.profile_id);
    let perfis: any[] = [];
    if (profileIds.length) {
      const profs = await sb(`profiles?id=in.(${profileIds.join(",")})&select=id,nome,apelido`);
      const map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      perfis = (perfisRows ?? []).map((p: any) => ({
        ...map[p.profile_id],
        descricao: p.descricao,
      }));
    }

    // Profetas (placar exato): TODAS predictions dos jogos encerrados, sem limit
    let profetasExatos: any[] = [];
    
    if (jogosEncerrados.length) {
      const matchIds = jogosEncerrados.map((m: any) => m.id);
      const todasPredictions = await sb(
        `predictions?match_id=in.(${matchIds.join(",")})&select=quota_id,match_id,placar_casa,placar_fora,pontos_calculados&order=pontos_calculados.desc`,
      );
      const mMap = Object.fromEntries(jogosEncerrados.map((m: any) => [m.id, m]));

      const exatosRaw = (todasPredictions ?? []).filter((p: any) => {
        const m = mMap[p.match_id];
        return m && p.placar_casa === m.placar_casa && p.placar_fora === m.placar_fora;
      });

      const allPreds = exatosRaw;
      if (allPreds.length) {
        const quotaIds = [...new Set(allPreds.map((p: any) => p.quota_id))];
        const quotas = await sb(`quotas?id=in.(${quotaIds.join(",")})&select=id,user_id,numero`);
        const userIds = [...new Set((quotas ?? []).map((q: any) => q.user_id))];
        const profs = userIds.length
          ? await sb(`profiles?id=in.(${userIds.join(",")})&select=id,nome,apelido`)
          : [];
        const qMap = Object.fromEntries((quotas ?? []).map((q: any) => [q.id, q]));
        const pMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));

        const enriquecer = (pr: any) => {
          const q = qMap[pr.quota_id] ?? {};
          const pf = pMap[q.user_id] ?? {};
          const m = mMap[pr.match_id] ?? {};
          const rk = q.user_id ? rankPosMap.get(q.user_id) : null;
          return {
            apelido: pf.apelido,
            nome: pf.nome,
            numero: q.numero,
            placar_casa: pr.placar_casa,
            placar_fora: pr.placar_fora,
            real_casa: m.placar_casa,
            real_fora: m.placar_fora,
            jogo: `${m.casa} x ${m.fora}`,
            pontos: pr.pontos_calculados,
            posicao_ranking: rk?.posicao,
            pontos_totais: rk?.pontos,
          };
        };
        profetasExatos = exatosRaw.map(enriquecer);
        
      }
    }

    const cfg = await fetchSettings();

    // Boletins anteriores publicados (até 3 mais recentes antes de hoje)
    const boletinsAnteriores = await sb(
      `boletins?status=eq.publicado&tipo=eq.regular&data_referencia=lt.${dataRef}&select=data_referencia,publicado_md&order=data_referencia.desc&limit=3`,
    );

    const userPrompt = montarPrompt({
      dataRef,
      jogosEncerrados,
      jogosAmanha: jogosAmanha ?? [],
      top10,
      bottomDinamico,
      perfis,
      profetasExatos,
      palpitesCuriosos,
      boletinsAnteriores: boletinsAnteriores ?? [],
    });

    // Chama Anthropic (com web search habilitado)
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
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
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResp.ok) {
      const errBody = await anthropicResp.text();
      throw new Error(`Anthropic API error: ${anthropicResp.status} ${errBody}`);
    }

    const anthropicData = await anthropicResp.json();
    const conteudo = (anthropicData.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    const tokensInput = anthropicData.usage?.input_tokens ?? 0;
    const tokensOutput = anthropicData.usage?.output_tokens ?? 0;

    const payload = {
      data_referencia: dataRef,
      tipo: "regular",
      rascunho_md: conteudo,
      status: "pendente_revisao",
      modelo_usado: cfg.modelo,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      updated_at: new Date().toISOString(),
    };


    let boletimId: string;
    if (existing.length > 0) {
      const upd = await sb(`boletins?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      boletimId = upd[0]?.id ?? existing[0].id;
    } else {
      const ins = await sb(`boletins`, { method: "POST", body: JSON.stringify(payload) });
      boletimId = ins[0]?.id;
    }

    // Audit
    try {
      await sb(`audit_log`, {
        method: "POST",
        body: JSON.stringify({
          acao: "gerou_boletim",
          entidade: "boletim",
          entidade_id: dataRef,
          ator_nome: "sistema",
          payload: { tokens_input: tokensInput, tokens_output: tokensOutput, modelo: cfg.modelo },
        }),
      });
    } catch (_) { /* ignore */ }

    return json({
      ok: true,
      data_referencia: dataRef,
      boletim_id: boletimId,
      status: "pendente_revisao",
      tokens: { input: tokensInput, output: tokensOutput },
    });
  } catch (e) {
    console.error("gerar-boletim-diario error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
