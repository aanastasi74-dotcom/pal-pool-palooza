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
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(s)) return "em_andamento";
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
};

function derivar(fixture: any): Derived {
  const apiStatus = fixture.fixture?.status?.short ?? "NS";
  const status = statusFromApi(apiStatus);
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
    // Ao vivo na prorrogação: tempo normal = fulltime (já fechado), prorrogação = placar corrente acumulado
    placar_casa = ft.home ?? null;
    placar_fora = ft.away ?? null;
    placar_casa_prorrogacao = goals.home ?? null;
    placar_fora_prorrogacao = goals.away ?? null;
  } else if (["AET", "PEN", "FT"].includes(apiStatus)) {
    placar_casa = ft.home ?? goals.home ?? null;
    placar_fora = ft.away ?? goals.away ?? null;
    if (et.home != null || et.away != null) {
      // API entrega só os gols DURANTE a prorrogação — somar com fulltime pra obter o acumulado
      placar_casa_prorrogacao = (ft.home ?? 0) + (et.home ?? 0);
      placar_fora_prorrogacao = (ft.away ?? 0) + (et.away ?? 0);
    }
    if (pen.home != null || pen.away != null) {
      penaltis_casa = pen.home ?? null;
      penaltis_fora = pen.away ?? null;
    }
  }
  return {
    placar_casa,
    placar_fora,
    placar_casa_prorrogacao,
    placar_fora_prorrogacao,
    penaltis_casa,
    penaltis_fora,
    status,
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

  // Filtro de relevância (cron): jogo não-encerrado com início em [agora-4h, agora+10min]
  if (action === "cron") {
    const agora = new Date();
    const inicio = new Date(agora.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const fim = new Date(agora.getTime() + 10 * 60 * 1000).toISOString();
    const relevantes: any[] = await sb(
      `matches?select=id&status=neq.encerrado&data_jogo=gte.${inicio}&data_jogo=lte.${fim}`,
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
    "matches?select=id,team_home_id,team_away_id,status,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora",
  );

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
    const patch = diffMatch(match, derived);
    if (!patch) continue;

    jogos_atualizados++;
    mudancas.push({ match_id: match.id, antes: match, depois: patch, fixture_id: f.fixture?.id });

    if (modo === "live") {
      // Buscar eventos quando o placar mudou
      const placarMudou =
        patch.placar_casa !== undefined ||
        patch.placar_fora !== undefined ||
        patch.placar_casa_prorrogacao !== undefined ||
        patch.placar_fora_prorrogacao !== undefined;
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
      const finalPatch: any = { ...patch };
      if (eventos !== undefined) finalPatch.eventos = eventos;
      await sb(`matches?id=eq.${match.id}`, {
        method: "PATCH",
        body: JSON.stringify(finalPatch),
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
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
