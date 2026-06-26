// Edge function: snapshot-top4-potenciais-iniciais
// POST {} → calcula o potencial máximo do Top 4 (replica engine.ts do frontend)
// pra cada quota com palpite salvo e grava em quotas.top4_potencial_inicial.
// Disparada pelo trigger trg_snapshot_top4_potencial_inicial quando o 72º
// jogo da fase de grupos é encerrado. Idempotente (UPDATE WHERE id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// ============================================================================
// Lógica replicada de src/lib/top4-potencial/engine.ts (manter sincronizada)
// ============================================================================

type Top4Picks = {
  campeao: string;
  vice: string;
  terceiro: string;
  quarto: string;
};

type Chave = "A" | "B" | "C" | "D";
type Lado = "cima" | "baixo";

type MatchLike = {
  numero_jogo: number | null;
  team_home_id: string | null;
  team_away_id: string | null;
  home_origem: string | null;
  away_origem: string | null;
  status: string | null;
};

type TeamLike = { id: string; bracket_position: string };

const VALOR_ACERTO_POSICAO = 1000;
const VALOR_POSICAO_ERRADA = 400;
const PESO_INICIAL_PERCENTUAL = 100; // snapshot tirado no fim da fase de grupos → eficácia plena

function derivarChaveamento(matches: MatchLike[]) {
  const byNumero = new Map<number, MatchLike>();
  for (const m of matches) if (m.numero_jogo != null) byNumero.set(m.numero_jogo, m);

  const quartasDe = (semiNum: number): number[] => {
    const semi = byNumero.get(semiNum);
    if (!semi) return [];
    return [semi.home_origem, semi.away_origem]
      .filter((o): o is string => !!o && o.startsWith("V"))
      .map((o) => Number(o.slice(1)));
  };

  const r32sDeQuarta = (quartaNum: number): number[] => {
    const quarta = byNumero.get(quartaNum);
    if (!quarta) return [];
    const oitavas = [quarta.home_origem, quarta.away_origem]
      .filter((o): o is string => !!o && o.startsWith("V"))
      .map((o) => Number(o.slice(1)));
    const r32s: number[] = [];
    for (const oitavaNum of oitavas) {
      const oitava = byNumero.get(oitavaNum);
      if (!oitava) continue;
      for (const o of [oitava.home_origem, oitava.away_origem]) {
        if (o && o.startsWith("V")) r32s.push(Number(o.slice(1)));
      }
    }
    return r32s;
  };

  const semi1 = quartasDe(101);
  const semi2 = quartasDe(102);
  if (semi1.length !== 2 || semi2.length !== 2) return null;

  const ordem: Array<{ chave: Chave; lado: Lado; quartaNum: number }> = [
    { chave: "A", lado: "cima", quartaNum: semi1[0] },
    { chave: "B", lado: "cima", quartaNum: semi1[1] },
    { chave: "C", lado: "baixo", quartaNum: semi2[0] },
    { chave: "D", lado: "baixo", quartaNum: semi2[1] },
  ];

  const chaves: Record<Chave, Set<string>> = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };
  const ladoDaChave: Record<Chave, Lado> = { A: "cima", B: "cima", C: "baixo", D: "baixo" };

  for (const { chave, lado, quartaNum } of ordem) {
    ladoDaChave[chave] = lado;
    for (const r32Num of r32sDeQuarta(quartaNum)) {
      const r32 = byNumero.get(r32Num);
      if (!r32) continue;
      if (r32.team_home_id) chaves[chave].add(r32.team_home_id);
      if (r32.team_away_id) chaves[chave].add(r32.team_away_id);
    }
  }
  return { chaves, ladoDaChave };
}

function permutar<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutar(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

function calcularPotencialMaximo(
  picks: Top4Picks,
  matches: MatchLike[],
  teams: TeamLike[],
  pesoPercentual: number,
): number {
  const faseGruposCompleta = matches
    .filter((m) => m.numero_jogo != null && m.numero_jogo >= 1 && m.numero_jogo <= 72)
    .every((m) => m.status === "encerrado");
  if (!faseGruposCompleta) return 0;

  const chav = derivarChaveamento(matches);
  if (!chav) return 0;

  const idDeBp = new Map(teams.map((t) => [t.bracket_position, t.id]));
  const slots = ["campeao", "vice", "terceiro", "quarto"] as const;
  const loc = {} as Record<typeof slots[number], Chave | "fora">;
  for (const k of slots) {
    const teamId = idDeBp.get(picks[k]);
    if (!teamId) { loc[k] = "fora"; continue; }
    const c = (["A", "B", "C", "D"] as Chave[]).find((ch) => chav.chaves[ch].has(teamId));
    loc[k] = c ?? "fora";
  }

  const fator = pesoPercentual / 100;
  const picksDistintos = Array.from(new Set(slots.map((s) => picks[s]).filter(Boolean)));
  let melhor = 0;

  for (const perm of permutar(picksDistintos)) {
    const atrib: Partial<Record<typeof slots[number], string>> = {};
    for (let i = 0; i < perm.length && i < slots.length; i++) atrib[slots[i]] = perm[i];

    let viavel = true;
    const usadas = new Set<Chave>();
    for (const s of slots) {
      const bp = atrib[s];
      if (!bp) continue;
      const k = slots.find((sl) => picks[sl] === bp)!;
      const cv = loc[k];
      if (cv === "fora") { viavel = false; break; }
      if (usadas.has(cv as Chave)) { viavel = false; break; }
      usadas.add(cv as Chave);
    }
    if (!viavel) continue;

    const bpC = atrib.campeao;
    const bpV = atrib.vice;
    if (bpC && bpV) {
      const kC = slots.find((sl) => picks[sl] === bpC)!;
      const kV = slots.find((sl) => picks[sl] === bpV)!;
      if (chav.ladoDaChave[loc[kC] as Chave] === chav.ladoDaChave[loc[kV] as Chave]) continue;
    }

    let pontos = 0;
    for (const s of slots) {
      const bp = atrib[s];
      if (!bp) continue;
      const kOrig = slots.find((sl) => picks[sl] === bp)!;
      pontos += kOrig === s ? VALOR_ACERTO_POSICAO : VALOR_POSICAO_ERRADA;
    }
    pontos = Math.floor(pontos * fator);
    if (pontos > melhor) melhor = pontos;
  }
  return melhor;
}

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Defensivo: só roda se os 72 jogos da fase de grupos estiverem encerrados
  const { count: encerrados, error: errCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .gte("numero_jogo", 1)
    .lte("numero_jogo", 72)
    .eq("status", "encerrado");
  if (errCount) return json({ error: errCount.message }, 500);
  if ((encerrados ?? 0) < 72) {
    return json({ skipped: true, motivo: "fase de grupos ainda não terminou", encerrados });
  }

  const [{ data: matches, error: errM }, { data: teams, error: errT }, { data: preds, error: errP }] = await Promise.all([
    supabase.from("matches").select("numero_jogo,team_home_id,team_away_id,home_origem,away_origem,status").order("numero_jogo"),
    supabase.from("teams").select("id,bracket_position"),
    supabase.from("top4_predictions").select("quota_id,posicao_1,posicao_2,posicao_3,posicao_4"),
  ]);
  if (errM || errT || errP) {
    return json({ error: errM?.message ?? errT?.message ?? errP?.message }, 500);
  }

  let processadas = 0;
  let erros = 0;
  const detalhes: Array<{ quota_id: string; potencial: number }> = [];

  for (const p of preds ?? []) {
    const picks: Top4Picks = {
      campeao: p.posicao_1 ?? "",
      vice: p.posicao_2 ?? "",
      terceiro: p.posicao_3 ?? "",
      quarto: p.posicao_4 ?? "",
    };
    if (!picks.campeao || !picks.vice || !picks.terceiro || !picks.quarto) continue;

    const potencial = calcularPotencialMaximo(
      picks,
      (matches ?? []) as MatchLike[],
      (teams ?? []) as TeamLike[],
      PESO_INICIAL_PERCENTUAL,
    );

    const { error: errU } = await supabase
      .from("quotas")
      .update({ top4_potencial_inicial: potencial })
      .eq("id", p.quota_id);

    if (errU) {
      erros++;
      console.error("update quota falhou", p.quota_id, errU.message);
    } else {
      processadas++;
      detalhes.push({ quota_id: p.quota_id, potencial });
    }
  }

  return json({ ok: true, processadas, erros, total_predictions: preds?.length ?? 0 });
});
