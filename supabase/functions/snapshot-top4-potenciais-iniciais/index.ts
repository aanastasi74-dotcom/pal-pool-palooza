// Edge function: snapshot-top4-potenciais-iniciais
// POST {} → calcula o potencial máximo do Top 4 (replica engine.ts do frontend)
// pra cada quota com palpite salvo e grava em quotas.top4_potencial_inicial.
// Disparada pelo trigger trg_snapshot_top4_potencial_inicial quando o 72º
// jogo da fase de grupos é encerrado. Idempotente (UPDATE WHERE id).
//
// ⚠️ ATENÇÃO: este arquivo é uma cópia do algoritmo em
// src/lib/top4-potencial/engine.ts. Se mudar a lógica aqui, FIXE LÁ TAMBÉM
// (e vice-versa). Bug do N.39/N.40 surgiu exatamente dessa duplicação.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronSecret } from "../_shared/require-cron-secret.ts";

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
const PLACEHOLDER = "__placeholder__";
const PESO_INICIAL_PERCENTUAL = 100; // snapshot tirado no fim da fase de grupos → eficácia plena

type SlotKey = "campeao" | "vice" | "terceiro" | "quarto";
const SLOTS: SlotKey[] = ["campeao", "vice", "terceiro", "quarto"];

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

function calcularPontosCenario(
  picksTeamIds: Record<SlotKey, string>,
  cenario: Record<SlotKey, string>,
  fator: number,
): number {
  const escolhasPereba = new Map<string, SlotKey>();
  for (const s of SLOTS) escolhasPereba.set(picksTeamIds[s], s);

  const posicoesReais = new Map<string, SlotKey>();
  for (const s of SLOTS) posicoesReais.set(cenario[s], s);

  let pontos = 0;
  for (const [teamId, slotPereba] of escolhasPereba) {
    if (teamId === PLACEHOLDER) continue;
    const slotReal = posicoesReais.get(teamId);
    if (!slotReal) continue;
    pontos += slotReal === slotPereba ? VALOR_ACERTO_POSICAO : VALOR_POSICAO_ERRADA;
  }
  return Math.floor(pontos * fator);
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
  const picksTeamIds: Record<SlotKey, string> = {
    campeao: idDeBp.get(picks.campeao) ?? PLACEHOLDER,
    vice: idDeBp.get(picks.vice) ?? PLACEHOLDER,
    terceiro: idDeBp.get(picks.terceiro) ?? PLACEHOLDER,
    quarto: idDeBp.get(picks.quarto) ?? PLACEHOLDER,
  };

  const teamIds = SLOTS.map((s) => picksTeamIds[s]).filter((id) => id !== PLACEHOLDER);
  const localizacao = new Map<string, Chave | "fora">();
  for (const tid of teamIds) {
    const chave = (["A", "B", "C", "D"] as Chave[]).find((c) => chav.chaves[c].has(tid));
    localizacao.set(tid, chave ?? "fora");
  }

  const candidatos: Record<Chave, string[]> = { A: [], B: [], C: [], D: [] };
  for (const tid of teamIds) {
    const loc = localizacao.get(tid);
    if (loc && loc !== "fora") candidatos[loc].push(tid);
  }

  const opcoes = (c: Chave) => (candidatos[c].length > 0 ? candidatos[c] : [PLACEHOLDER]);
  const fator = pesoPercentual / 100;
  let melhor = 0;

  for (const semiA of opcoes("A")) {
    for (const semiB of opcoes("B")) {
      for (const semiC of opcoes("C")) {
        for (const semiD of opcoes("D")) {
          for (const venceuS1 of [semiA, semiB]) {
            const perdeuS1 = venceuS1 === semiA ? semiB : semiA;
            for (const venceuS2 of [semiC, semiD]) {
              const perdeuS2 = venceuS2 === semiC ? semiD : semiC;
              for (const campeao of [venceuS1, venceuS2]) {
                const vice = campeao === venceuS1 ? venceuS2 : venceuS1;
                for (const terceiro of [perdeuS1, perdeuS2]) {
                  const quarto = terceiro === perdeuS1 ? perdeuS2 : perdeuS1;
                  const pts = calcularPontosCenario(
                    picksTeamIds,
                    { campeao, vice, terceiro, quarto },
                    fator,
                  );
                  if (pts > melhor) melhor = pts;
                }
              }
            }
          }
        }
      }
    }
  }
  return melhor;
}

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronCheck = requireCronSecret(req);
  if (cronCheck) return cronCheck;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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
    }
  }

  return json({ ok: true, processadas, erros, total_predictions: preds?.length ?? 0 });
});
