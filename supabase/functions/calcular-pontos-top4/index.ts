// Edge function: calcular-pontos-top4
// POST {} → recalcula pontos do Top 4 de todas as quotas e atualiza quotas.pontos
// (somando jogos + top4).

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

const VALOR_ACERTO_POSICAO = 1000;
const VALOR_POSICAO_ERRADA = 400;

type Oficial = {
  campeao: string | null;
  vice: string | null;
  terceiro: string | null;
  quarto: string | null;
};

type Palpite = {
  posicao_1: string | null;
  posicao_2: string | null;
  posicao_3: string | null;
  posicao_4: string | null;
};

function calcularPontosTop4(palpite: Palpite, oficial: Oficial, pesoPercentual: number): number {
  const fator = pesoPercentual / 100;
  const palpiteList = [palpite.posicao_1, palpite.posicao_2, palpite.posicao_3, palpite.posicao_4];
  const oficialList = [oficial.campeao, oficial.vice, oficial.terceiro, oficial.quarto];
  let pontos = 0;
  for (let i = 0; i < 4; i++) {
    const p = palpiteList[i];
    if (!p) continue;
    if (p === oficialList[i]) {
      pontos += Math.round(VALOR_ACERTO_POSICAO * fator);
    } else if (oficialList.includes(p)) {
      pontos += Math.round(VALOR_POSICAO_ERRADA * fator);
    }
  }
  return pontos;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const settings = await sb(`settings?key=eq.top4_oficial&select=value`);
    const oficial: Oficial = settings[0]?.value;
    if (!oficial || !oficial.campeao || !oficial.vice || !oficial.terceiro || !oficial.quarto) {
      return json({ error: "top4_oficial não foi totalmente preenchido nas settings" }, 400);
    }

    const palpites = await sb(
      `top4_predictions?select=id,quota_id,posicao_1,posicao_2,posicao_3,posicao_4,peso_no_palpite`,
    );

    let palpitesAtualizados = 0;
    for (const p of palpites) {
      const pontos = calcularPontosTop4(p, oficial, p.peso_no_palpite ?? 100);
      await sb(`top4_predictions?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pontos_calculados: pontos }),
      });
      palpitesAtualizados++;
    }

    const quotas = await sb(`quotas?select=id`);
    let quotasAtualizadas = 0;
    for (const q of quotas) {
      const predictions = await sb(`predictions?quota_id=eq.${q.id}&select=pontos_calculados`);
      const pontosJogos = predictions.reduce(
        (s: number, x: any) => s + (x.pontos_calculados ?? 0),
        0,
      );
      const top4 = await sb(`top4_predictions?quota_id=eq.${q.id}&select=pontos_calculados`);
      const pontosTop4 = top4.reduce((s: number, x: any) => s + (x.pontos_calculados ?? 0), 0);
      await sb(`quotas?id=eq.${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pontos: pontosJogos + pontosTop4 }),
      });
      quotasAtualizadas++;
    }

    await sb(`audit_log`, {
      method: "POST",
      body: JSON.stringify({
        acao: "calculou_pontos_top4",
        entidade: "settings",
        entidade_id: "top4_oficial",
        ator_nome: "system",
        payload: {
          palpites_atualizados: palpitesAtualizados,
          quotas_atualizadas: quotasAtualizadas,
          top4_oficial: oficial,
        },
      }),
    });

    return json({
      success: true,
      palpites_atualizados: palpitesAtualizados,
      quotas_atualizadas: quotasAtualizadas,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
