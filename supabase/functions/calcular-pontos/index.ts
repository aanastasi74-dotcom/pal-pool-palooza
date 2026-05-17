// Edge function: calcular-pontos
// POST { match_id: uuid } → recalcula pontos do match e atualiza quotas.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const REGRAS_DEFAULT = { exato: 12, resultado: 4, dif_gols: 2, gols_time: 1 };

function calcularPontos(pc: number, pf: number, rc: number, rf: number, regras: any): number {
  if (pc === rc && pf === rf) return regras.exato;
  let pts = 0;
  const rp = Math.sign(pc - pf);
  const rr = Math.sign(rc - rf);
  if (rp === rr) pts += regras.resultado;
  if ((pc - pf) === (rc - rf)) pts += regras.dif_gols;
  if (pc === rc || pf === rf) pts += regras.gols_time;
  return pts;
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
  return r.json();
}

async function rpc(fn: string, args: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { match_id } = await req.json();
    if (!match_id) return json({ error: "match_id required" }, 400);

    const matches = await sb(`matches?id=eq.${match_id}&select=*`);
    const match = matches[0];
    if (!match) return json({ error: "Match not found" }, 404);
    if (match.status !== "encerrado") return json({ error: "Jogo ainda não foi encerrado" }, 400);
    if (match.placar_casa == null || match.placar_fora == null) return json({ error: "Placares ausentes" }, 400);

    const settings = await sb(`settings?key=eq.score_rules&select=value`);
    const regras = settings[0]?.value ?? REGRAS_DEFAULT;
    const peso = Number(match.peso ?? 10);

    const preds = await sb(
      `predictions?match_id=eq.${match_id}&submetido_em=not.is.null&select=id,quota_id,placar_casa,placar_fora`,
    );

    let predsCount = 0;
    for (const p of preds) {
      if (p.placar_casa == null || p.placar_fora == null) continue;
      const base = calcularPontos(p.placar_casa, p.placar_fora, match.placar_casa, match.placar_fora, regras);
      const pontos = base * peso;
      await sb(`predictions?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pontos_calculados: pontos, updated_at: new Date().toISOString() }),
      });
      predsCount++;
    }

    // Recalcula totais por quota via SQL (RPC genérica não existe — fazer em loop client-side)
    const quotas = await sb(`quotas?select=id,user_id`);
    const totalMatchesTravados = (await sb(
      `matches?travado_em=not.is.null&travado_em=lte.${new Date().toISOString()}&select=id`,
    )).length;

    const lantSettings = await sb(`settings?key=eq.lanterninha_rule&select=value`);
    const lantRule = lantSettings[0]?.value ?? { engajamento_minimo: 0.8, pontos_minimos: 200 };

    let quotasCount = 0;
    const totaisPontos: { id: string; pontos: number }[] = [];
    for (const q of quotas) {
      const allPreds = await sb(
        `predictions?quota_id=eq.${q.id}&select=pontos_calculados,submetido_em`,
      );
      const pontosJogos = allPreds.reduce((s: number, x: any) => s + (x.pontos_calculados ?? 0), 0);
      const top4 = await sb(`top4_predictions?quota_id=eq.${q.id}&select=pontos_calculados`);
      const pontosTop4 = top4.reduce((s: number, x: any) => s + (x.pontos_calculados ?? 0), 0);
      const pontos = pontosJogos + pontosTop4;
      const validos = allPreds.filter((x: any) => x.submetido_em != null).length;
      const possiveis = totalMatchesTravados;
      const engajamento = possiveis > 0 ? validos / possiveis : 0;
      const elegivel = engajamento >= lantRule.engajamento_minimo && pontos >= lantRule.pontos_minimos;
      await sb(`quotas?id=eq.${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          pontos,
          palpites_validos: validos,
          palpites_possiveis: possiveis,
          elegivel_lanterna: elegivel,
        }),
      });
      totaisPontos.push({ id: q.id, pontos });
      quotasCount++;
    }

    // Posições
    totaisPontos.sort((a, b) => b.pontos - a.pontos);
    for (let i = 0; i < totaisPontos.length; i++) {
      await sb(`quotas?id=eq.${totaisPontos[i].id}`, {
        method: "PATCH",
        body: JSON.stringify({ posicao: i + 1 }),
      });
    }

    await sb(`audit_log`, {
      method: "POST",
      body: JSON.stringify({
        acao: "calculou_pontos",
        entidade: "match",
        entidade_id: match_id,
        ator_nome: "system",
        payload: { predictions_atualizadas: predsCount, quotas_atualizadas: quotasCount },
      }),
    });

    return json({ success: true, predictions_atualizadas: predsCount, quotas_atualizadas: quotasCount });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
