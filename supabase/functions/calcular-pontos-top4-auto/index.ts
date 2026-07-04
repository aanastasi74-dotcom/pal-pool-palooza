// Edge function: calcular-pontos-top4-auto
// Cálculo automático parcial do Top 4 (P.4).
// Idempotente: recalcula top4_predictions.pontos_calculados a partir do estado
// atual dos jogos das fases Quartas / Final / Disputa de terceiro, e depois
// recalcula quotas.pontos = SUM(predictions) + SUM(top4_predictions).
//
// Regras (Opção A):
//   - Semifinalistas confirmados = vencedores das Quartas ENCERRADAS.
//     Para cada palpite (em qualquer slot) que bata com um semifinalista
//     confirmado: base += 400 × fator.
//   - Final encerrada: +600 × fator se palpite.campeao == 1º real; idem vice.
//   - Disputa de terceiro encerrada: +600 × fator se palpite.terceiro == 3º
//     real; idem quarto.
//   - fator = peso_no_palpite / 100 (25/50/100 → 0.25/0.50/1.00).
//
// Auth: Dual (x-cron-secret ou JWT admin).
// Trigger dispara via pg_net após encerramento de cada jogo dessas fases.

import { requireCronOrAdmin } from "../_shared/require-cron-or-admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const VALOR_BASE_EM_TOP4 = 400;
const VALOR_TOPUP_POSICAO = 600;

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

type MatchRow = {
  id: string;
  fase: string | null;
  numero_jogo: number | null;
  status: string | null;
  team_home_id: string | null;
  team_away_id: string | null;
  placar_casa: number | null;
  placar_fora: number | null;
  placar_casa_prorrogacao: number | null;
  placar_fora_prorrogacao: number | null;
  penaltis_casa: number | null;
  penaltis_fora: number | null;
};

function vencedorReal(m: MatchRow): string | null {
  if (m.placar_casa == null || m.placar_fora == null) return null;
  if (m.placar_casa > m.placar_fora) return m.team_home_id;
  if (m.placar_casa < m.placar_fora) return m.team_away_id;
  const pc = m.placar_casa_prorrogacao;
  const pf = m.placar_fora_prorrogacao;
  if (pc != null && pf != null) {
    if (pc > pf) return m.team_home_id;
    if (pc < pf) return m.team_away_id;
  }
  if (m.penaltis_casa != null && m.penaltis_fora != null) {
    return (m.penaltis_casa > m.penaltis_fora) ? m.team_home_id : m.team_away_id;
  }
  return null;
}

function perdedorReal(m: MatchRow): string | null {
  const v = vencedorReal(m);
  if (!v) return null;
  return v === m.team_home_id ? m.team_away_id : m.team_home_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireCronOrAdmin(req);
    if (!auth.ok) return auth.res;

    // 1) Carrega matches decisivos
    const matches: MatchRow[] = await sb(
      `matches?fase=in.(Quartas,Final,Disputa%20de%20terceiro)&select=id,fase,numero_jogo,status,team_home_id,team_away_id,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora`,
    );

    // Semifinalistas = vencedores das Quartas encerradas
    const semifinalistas = new Set<string>();
    for (const m of matches) {
      if (m.fase === "Quartas" && m.status === "encerrado") {
        const v = vencedorReal(m);
        if (v) semifinalistas.add(v);
      }
    }

    // Final e disputa 3º
    let campeao: string | null = null;
    let vice: string | null = null;
    let terceiro: string | null = null;
    let quarto: string | null = null;
    for (const m of matches) {
      if (m.status !== "encerrado") continue;
      if (m.fase === "Final") {
        campeao = vencedorReal(m);
        vice = perdedorReal(m);
      } else if (m.fase === "Disputa de terceiro") {
        terceiro = vencedorReal(m);
        quarto = perdedorReal(m);
      }
    }

    // 2) Percorre top4_predictions e recalcula pontos_calculados
    const palpites = await sb(
      `top4_predictions?select=id,quota_id,posicao_1,posicao_2,posicao_3,posicao_4,peso_no_palpite`,
    );

    let palpitesAtualizados = 0;
    for (const p of palpites) {
      const fator = (p.peso_no_palpite ?? 100) / 100;
      const slots = [
        { chute: p.posicao_1 as string | null, oficial: campeao },
        { chute: p.posicao_2 as string | null, oficial: vice },
        { chute: p.posicao_3 as string | null, oficial: terceiro },
        { chute: p.posicao_4 as string | null, oficial: quarto },
      ];
      let pontos = 0;
      for (const s of slots) {
        if (!s.chute) continue;
        // Base 400 × fator se palpite bate com semifinalista confirmado
        if (semifinalistas.has(s.chute)) {
          pontos += Math.round(VALOR_BASE_EM_TOP4 * fator);
        }
        // Top-up 600 × fator se posição exata confirmada
        if (s.oficial && s.chute === s.oficial) {
          pontos += Math.round(VALOR_TOPUP_POSICAO * fator);
        }
      }
      await sb(`top4_predictions?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pontos_calculados: pontos }),
      });
      palpitesAtualizados++;
    }

    // 3) Recalcula quotas.pontos = SUM(predictions) + SUM(top4_predictions)
    const quotas = await sb(`quotas?select=id`);
    let quotasAtualizadas = 0;
    for (const q of quotas) {
      const preds = await sb(
        `predictions?quota_id=eq.${q.id}&select=pontos_calculados`,
      );
      const pontosJogos = preds.reduce(
        (s: number, x: any) => s + (x.pontos_calculados ?? 0),
        0,
      );
      const t4 = await sb(
        `top4_predictions?quota_id=eq.${q.id}&select=pontos_calculados`,
      );
      const pontosTop4 = t4.reduce(
        (s: number, x: any) => s + (x.pontos_calculados ?? 0),
        0,
      );
      await sb(`quotas?id=eq.${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pontos: pontosJogos + pontosTop4 }),
      });
      quotasAtualizadas++;
    }

    // 4) Audit
    let body: any = {};
    try {
      body = await req.json();
    } catch { /* ignore */ }

    await sb(`audit_log`, {
      method: "POST",
      body: JSON.stringify({
        acao: "calculou_pontos_top4_auto",
        entidade: "matches",
        entidade_id: body?.match_id ?? null,
        ator_nome: auth.via === "cron" ? "system_cron" : "admin",
        payload: {
          via: auth.via,
          trigger: body?.trigger ?? "manual",
          match_id: body?.match_id ?? null,
          fase: body?.fase ?? null,
          semifinalistas_qtd: semifinalistas.size,
          final_encerrada: !!campeao,
          terceiro_encerrada: !!terceiro,
          palpites_atualizados: palpitesAtualizados,
          quotas_atualizadas: quotasAtualizadas,
        },
      }),
    });

    return json({
      success: true,
      via: auth.via,
      semifinalistas: semifinalistas.size,
      campeao_confirmado: !!campeao,
      terceiro_confirmado: !!terceiro,
      palpites_atualizados: palpitesAtualizados,
      quotas_atualizadas: quotasAtualizadas,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
