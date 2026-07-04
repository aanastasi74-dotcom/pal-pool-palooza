// Edge function: sync-match-scores
// POST { action?: 'cron' | 'manual' | 'teste' | 'mapear' }
// Sincroniza placares dos jogos via API-Football (league=1).
// Convenção: placar_casa/placar_fora = tempo normal; colunas próprias pra prorrogação e pênaltis.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY") ?? "";
const API_BASE = "https://v3.football.api-sports.io";

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
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`supabase ${path}: ${r.status} ${txt}`);
  }
  const ct = r.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? r.json() : null;
}

async function getSetting(key: string): Promise<any> {
  const rows = await sb(`settings?key=eq.${encodeURIComponent(key)}&select=value`);
  return rows?.[0]?.value ?? null;
}

async function setSetting(key: string, value: any) {
  await sb(`settings?key=eq.${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ value, updated_at: new Date().toISOString() }),
  });
}

async function apiFootball(path: string): Promise<any> {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`api-football ${path}: ${r.status} ${txt}`);
  }
  return r.json();
}

// De-para nome_pt → nome na API-Football
const NOME_MAP: Record<string, string> = {
  "África do Sul": "South Africa",
  "Argélia": "Algeria",
  "Alemanha": "Germany",
  "Arábia Saudita": "Saudi Arabia",
  "Argentina": "Argentina",
  "Austrália": "Australia",
  "Áustria": "Austria",
  "Bélgica": "Belgium",
  "Bósnia e Herzegovina": "Bosnia",
  "Brasil": "Brazil",
  "Cabo Verde": "Cape Verde Islands",
  "Canadá": "Canada",
  "Catar": "Qatar",
  "Colômbia": "Colombia",
  "Coreia do Sul": "South Korea",
  "Costa do Marfim": "Ivory Coast",
  "Croácia": "Croatia",
  "Curaçau": "Curacao",
  "Escócia": "Scotland",
  "Egito": "Egypt",
  "Equador": "Ecuador",
  "Espanha": "Spain",
  "Estados Unidos": "USA",
  "França": "France",
  "Gana": "Ghana",
  "Haiti": "Haiti",
  "Holanda": "Netherlands",
  "Inglaterra": "England",
  "Irã": "Iran",
  "Iraque": "Iraq",
  "Japão": "Japan",
  "Jordânia": "Jordan",
  "Marrocos": "Morocco",
  "México": "Mexico",
  "Nova Zelândia": "New Zealand",
  "Noruega": "Norway",
  "Panamá": "Panama",
  "Paraguai": "Paraguay",
  "Portugal": "Portugal",
  "RD Congo": "DR Congo",
  "República Tcheca": "Czech Republic",
  "Senegal": "Senegal",
  "Suécia": "Sweden",
  "Suíça": "Switzerland",
  "Tunísia": "Tunisia",
  "Turquia": "Turkey",
  "Uruguai": "Uruguay",
  "Uzbequistão": "Uzbekistan",
};

function statusFromApi(s: string): string {
  if (["NS", "TBD", "PST", "CANC", "SUSP", "AWD", "WO"].includes(s)) return "agendado";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(s)) return "ao-vivo";
  if (["FT", "AET", "PEN"].includes(s)) return "encerrado";
  return "agendado";
}

type Derived = {
  placar_casa: number | null;
  placar_fora: number | null;
  placar_casa_prorrogacao: number | null;
  placar_fora_prorrogacao: number | null;
  penaltis_casa: number | null;
  penaltis_fora: number | null;
  status: string;
  status_api: string | null;
  minuto_atual: number | null;
  minuto_extra: number | null;
};

function derivar(fixture: any): Derived {
  const apiStatus = fixture.fixture?.status?.short ?? "NS";
  const status = statusFromApi(apiStatus);
  const elapsed = fixture.fixture?.status?.elapsed;
  const extra = fixture.fixture?.status?.extra;
  const goals = fixture.goals ?? {};
  const score = fixture.score ?? {};
  const ft = score.fulltime ?? {};
  const et = score.extratime ?? {};
  const pen = score.penalty ?? {};

  let placar_casa: number | null = null;
  let placar_fora: number | null = null;
  let placar_casa_prorrogacao: number | null = null;
  let placar_fora_prorrogacao: number | null = null;
  let penaltis_casa: number | null = null;
  let penaltis_fora: number | null = null;

  if (["1H", "HT", "2H"].includes(apiStatus)) {
    placar_casa = goals.home ?? null;
    placar_fora = goals.away ?? null;
  } else if (["ET", "BT", "P"].includes(apiStatus)) {
    // Ao vivo na prorrogação: tempo normal = fulltime (já fechado);
    // prorrogação = DELTA (goals acumulado − fulltime). goals.home/away vem ACUMULADO pela API.
    placar_casa = ft.home ?? null;
    placar_fora = ft.away ?? null;
    if (goals.home != null && ft.home != null) {
      placar_casa_prorrogacao = Math.max(0, goals.home - ft.home);
    }
    if (goals.away != null && ft.away != null) {
      placar_fora_prorrogacao = Math.max(0, goals.away - ft.away);
    }
  } else if (["AET", "PEN", "FT"].includes(apiStatus)) {
    placar_casa = ft.home ?? goals.home ?? null;
    placar_fora = ft.away ?? goals.away ?? null;
    if (et.home != null || et.away != null) {
      // API-Football: score.extratime vem ACUMULADO após 120min (inclui tempo normal).
      // Convenção do bolão exige DELTA (só os gols da prorrogação).
      placar_casa_prorrogacao = Math.max(0, (et.home ?? 0) - (ft.home ?? 0));
      placar_fora_prorrogacao = Math.max(0, (et.away ?? 0) - (ft.away ?? 0));
    }
    if (pen.home != null || pen.away != null) {
      penaltis_casa = pen.home ?? null;
      penaltis_fora = pen.away ?? null;
    }
  }

  // Tempo de jogo: só faz sentido em andamento. Jogos finalizados/agendados zeram.
  const emAndamento = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(apiStatus);
  const minuto_atual = emAndamento ? (elapsed ?? null) : null;
  const minuto_extra = emAndamento ? (extra ?? null) : null;

  return {
    placar_casa,
    placar_fora,
    placar_casa_prorrogacao,
    placar_fora_prorrogacao,
    penaltis_casa,
    penaltis_fora,
    status,
    status_api: apiStatus ?? null,
    minuto_atual,
    minuto_extra,
  };
}

function diffMatch(atual: any, novo: Derived): Partial<Derived> | null {
  const fields: (keyof Derived)[] = [
    "placar_casa",
    "placar_fora",
    "placar_casa_prorrogacao",
    "placar_fora_prorrogacao",
    "penaltis_casa",
    "penaltis_fora",
    "status",
    "status_api",
    "minuto_atual",
    "minuto_extra",
  ];
  const patch: any = {};
  for (const f of fields) {
    if ((atual[f] ?? null) !== (novo[f] ?? null)) patch[f] = novo[f];
  }
  return Object.keys(patch).length === 0 ? null : patch;
}


async function actionMapear(season: string) {
  const data = await apiFootball(`/teams?league=1&season=${season}`);
  const apiTeams: any[] = data.response ?? [];
  const teams: any[] = await sb("teams?select=id,nome_pt,codigo_api");

  const apiByName: Record<string, number> = {};
  for (const t of apiTeams) apiByName[String(t.team?.name ?? "").toLowerCase()] = t.team?.id;

  const resultado: any[] = [];
  for (const team of teams) {
    const alvo = NOME_MAP[team.nome_pt] ?? team.nome_pt;
    const codigo = apiByName[alvo.toLowerCase()] ?? null;
    if (codigo && team.codigo_api !== codigo) {
      await sb(`teams?id=eq.${team.id}`, {
        method: "PATCH",
        body: JSON.stringify({ codigo_api: codigo }),
      });
    }
    resultado.push({
      nome_pt: team.nome_pt,
      nome_api: alvo,
      codigo_api: codigo,
      casado: !!codigo,
    });
  }
  return { mapeados: resultado.filter((r) => r.casado).length, total: resultado.length, resultado, chamadas_api: 1 };
}

async function actionTeste() {
  const data = await apiFootball(`/fixtures?league=1&season=2022`);
  const fixtures: any[] = data.response ?? [];
  const detalhe = fixtures.map((f) => ({
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
    status: f.fixture?.status?.short,
    raw: {
      halftime: f.score?.halftime,
      fulltime: f.score?.fulltime,
      extratime: f.score?.extratime,
      penalty: f.score?.penalty,
    },
    derivado: derivar(f),
  }));
  return { total: detalhe.length, detalhe, chamadas_api: 1 };
}

async function actionSync(modo: string, season: string, action: string) {
  let chamadas_api = 0;
  let jogos_verificados = 0;
  let jogos_atualizados = 0;
  const mudancas: any[] = [];

  // Filtro de relevância (cron): jogo não-encerrado em janela [agora-4h, agora+10min],
  // OU jogo encerrado recentemente (updated_at nos últimos 15 min) — permite capturar
  // updates tardios da API (ex.: score.extratime propaga depois do status AET).
  if (action === "cron") {
    const agora = new Date();
    const inicio = new Date(agora.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const fim = new Date(agora.getTime() + 10 * 60 * 1000).toISOString();
    const grace = new Date(agora.getTime() - 15 * 60 * 1000).toISOString();
    const relevantes: any[] = await sb(
      `matches?select=id&data_jogo=gte.${inicio}&data_jogo=lte.${fim}` +
        `&or=(status.neq.encerrado,updated_at.gte.${grace})`,
    );
    if ((relevantes?.length ?? 0) === 0) {
      return { skipped: true, motivo: "sem_jogo_relevante", chamadas_api, jogos_verificados, jogos_atualizados, mudancas };
    }
  }

  // Busca fixtures da temporada (1 chamada)
  const fixData = await apiFootball(`/fixtures?league=1&season=${season}`);
  chamadas_api++;
  const fixtures: any[] = fixData.response ?? [];

  // Carrega teams (codigo_api -> id) e matches
  const teams: any[] = await sb("teams?select=id,codigo_api");
  const teamByCodigo: Record<number, string> = {};
  for (const t of teams) if (t.codigo_api) teamByCodigo[t.codigo_api] = t.id;

  const matches: any[] = await sb(
    "matches?select=id,team_home_id,team_away_id,status,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora,tentativas_encerramento",
  );

  const MAX_TENTATIVAS_ENCERRAMENTO = 3;

  for (const f of fixtures) {
    const homeApi = f.teams?.home?.id;
    const awayApi = f.teams?.away?.id;
    const homeId = teamByCodigo[homeApi];
    const awayId = teamByCodigo[awayApi];
    if (!homeId || !awayId) continue;

    const match = matches.find(
      (m) => m.team_home_id === homeId && m.team_away_id === awayId,
    );
    if (!match) continue;
    jogos_verificados++;

    const derived = derivar(f);

    // Grace period: API-Football às vezes flipa pra AET/PEN antes de popular
    // score.extratime.home/away. Se aceitarmos como final agora, prorrogação fica 0/0
    // congelado (bug do M82). Segurar por até N ciclos até et propagar.
    const apiStatus = f.fixture?.status?.short ?? "NS";
    const precisaProrrogacao = ["AET", "PEN"].includes(apiStatus);
    const et = f.score?.extratime ?? {};
    const extratimeVazio = et.home == null && et.away == null;
    const vaiEncerrar = derived.status === "encerrado" && match.status !== "encerrado";

    let tentativasPatch: number | null = null;
    let adiarEncerramento = false;

    if (precisaProrrogacao && extratimeVazio && vaiEncerrar) {
      const tent = (match.tentativas_encerramento ?? 0) + 1;
      if (tent < MAX_TENTATIVAS_ENCERRAMENTO) {
        adiarEncerramento = true;
        tentativasPatch = tent;
        // Não flipa status, não sobrescreve prorrogação com nada
        derived.status = match.status;
        derived.placar_casa_prorrogacao = match.placar_casa_prorrogacao;
        derived.placar_fora_prorrogacao = match.placar_fora_prorrogacao;
        derived.penaltis_casa = match.penaltis_casa;
        derived.penaltis_fora = match.penaltis_fora;
      } else {
        // Fallback: aceita como final mesmo assim (evita travar em ao-vivo)
        tentativasPatch = 0;
      }
    } else if (vaiEncerrar && (match.tentativas_encerramento ?? 0) > 0) {
      // Encerramento normal — zera contador se estava incrementado
      tentativasPatch = 0;
    }

    const patch = diffMatch(match, derived);
    const contadorMudou =
      tentativasPatch !== null && tentativasPatch !== (match.tentativas_encerramento ?? 0);
    if (!patch && !contadorMudou) continue;

    const patchFinal: any = patch ? { ...patch } : {};
    if (contadorMudou) patchFinal.tentativas_encerramento = tentativasPatch;


    jogos_atualizados++;
    mudancas.push({ match_id: match.id, antes: match, depois: patchFinal, fixture_id: f.fixture?.id, grace: adiarEncerramento });


    if (modo === "live") {
      // Buscar eventos quando o placar mudou
      const placarMudou =
        patchFinal.placar_casa !== undefined ||
        patchFinal.placar_fora !== undefined ||
        patchFinal.placar_casa_prorrogacao !== undefined ||
        patchFinal.placar_fora_prorrogacao !== undefined;
      let eventos: any = undefined;
      if (placarMudou && f.fixture?.id) {
        try {
          const ev = await apiFootball(`/fixtures/events?fixture=${f.fixture.id}`);
          chamadas_api++;
          eventos = (ev.response ?? []).filter((e: any) => e.type === "Goal");
        } catch (e) {
          console.warn("falha eventos:", e);
        }
      }
      const payloadWrite: any = { ...patchFinal };
      if (eventos !== undefined) payloadWrite.eventos = eventos;
      await sb(`matches?id=eq.${match.id}`, {
        method: "PATCH",
        body: JSON.stringify(payloadWrite),
      });
    }

  }

  return { chamadas_api, jogos_verificados, jogos_atualizados, mudancas, modo };
}

async function logRun(row: any) {
  try {
    await sb("sync_logs", { method: "POST", body: JSON.stringify(row) });
  } catch (e) {
    console.warn("falha log:", e);
  }
}

import { requireCronOrAdmin } from "../_shared/require-cron-or-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireCronOrAdmin(req);
  if (!auth.ok) return auth.res;


  const t0 = Date.now();
  let action = "cron";
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    action = body.action ?? "cron";
  } catch { /* noop */ }

  try {
    if (action === "teste") {
      const r = await actionTeste();
      await logRun({
        modo: "teste",
        season: "2022",
        jogos_verificados: r.total,
        jogos_atualizados: 0,
        chamadas_api: r.chamadas_api,
        duracao_ms: Date.now() - t0,
        detalhe: { sample: r.detalhe.slice(0, 5), total: r.total },
      });
      return json({ ok: true, ...r });
    }

    if (action === "mapear") {
      const season = String((await getSetting("sync_season")) ?? "2022");
      const r = await actionMapear(season);
      await logRun({
        modo: "manual",
        season,
        jogos_verificados: 0,
        jogos_atualizados: r.mapeados,
        chamadas_api: r.chamadas_api,
        duracao_ms: Date.now() - t0,
        detalhe: { mapear: r.resultado },
      });
      return json({ ok: true, ...r });
    }

    // cron | manual
    const ativo = await getSetting("sync_ativo");
    const season = String((await getSetting("sync_season")) ?? "2022");
    const modo = String((await getSetting("sync_modo")) ?? "shadow");

    if (action === "cron" && ativo !== true) {
      return json({ ok: true, skipped: true, motivo: "sync_ativo=false" });
    }

    const r = await actionSync(modo, season, action);
    await setSetting("sync_ultima_execucao", new Date().toISOString());
    await logRun({
      modo: action === "manual" ? "manual" : modo,
      season,
      jogos_verificados: r.jogos_verificados ?? 0,
      jogos_atualizados: r.jogos_atualizados ?? 0,
      chamadas_api: r.chamadas_api ?? 0,
      duracao_ms: Date.now() - t0,
      detalhe: r.skipped ? { skipped: true, motivo: r.motivo } : { mudancas: r.mudancas, modo },
    });
    return json({ ok: true, ...r });
  } catch (e: any) {
    console.error("sync-match-scores erro:", e);
    await logRun({
      modo: action,
      season: null,
      jogos_verificados: 0,
      jogos_atualizados: 0,
      chamadas_api: 0,
      duracao_ms: Date.now() - t0,
      erro: String(e?.message ?? e),
    });
    return json({ ok: false, erro: String(e?.message ?? e) }, 500);
  }
});
