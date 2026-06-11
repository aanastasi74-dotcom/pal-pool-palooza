// Edge function: get-match-details
// POST { match_id: uuid }
// Retorna detalhes do jogo (header, placar, eventos do banco).
// Quando o jogo está 'encerrado' e ainda não há cache, busca
// estatisticas + escalacoes na API-Football, popula matches.estatisticas
// e matches.escalacoes, e retorna no payload.
//
// NÃO chama a API quando o jogo está agendado ou ao-vivo —
// preserva a quota da API-Football.

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

async function getSetting(key: string): Promise<any> {
  const rows = await sb(`settings?key=eq.${encodeURIComponent(key)}&select=value`);
  return rows?.[0]?.value ?? null;
}

async function resolveFixtureId(match: any, homeCodigo: number | null, awayCodigo: number | null): Promise<number | null> {
  if (!homeCodigo || !awayCodigo) return null;
  const season = String((await getSetting("sync_season")) ?? "2022");
  // Janela de 1 dia em torno do data_jogo (UTC) pra reduzir payload.
  const d = new Date(match.data_jogo);
  const from = new Date(d.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = new Date(d.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const res = await apiFootball(
    `/fixtures?league=1&season=${season}&from=${from}&to=${to}`,
  );
  const list: any[] = res.response ?? [];
  const f = list.find(
    (x) =>
      x.teams?.home?.id === homeCodigo && x.teams?.away?.id === awayCodigo,
  );
  return f?.fixture?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let match_id: string | undefined;
  try {
    const body = await req.json();
    match_id = body?.match_id;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!match_id || typeof match_id !== "string") {
    return json({ error: "match_id_required" }, 400);
  }

  try {
    const matches: any[] = await sb(
      `matches?id=eq.${encodeURIComponent(match_id)}&select=id,numero_jogo,data_jogo,peso,estadio,cidade,stadium_id,status,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora,team_home_id,team_away_id,casa,fora,slot_casa,slot_visitante,eventos,estatisticas,escalacoes,fase`,
    );
    const match = matches?.[0];
    if (!match) return json({ error: "match_not_found" }, 404);

    const teamIds = [match.team_home_id, match.team_away_id].filter(Boolean);
    let homeTeam: any = null;
    let awayTeam: any = null;
    if (teamIds.length) {
      const teams: any[] = await sb(
        `teams?id=in.(${teamIds.join(",")})&select=id,nome_pt,bandeira_emoji,codigo_api`,
      );
      homeTeam = teams.find((t) => t.id === match.team_home_id) ?? null;
      awayTeam = teams.find((t) => t.id === match.team_away_id) ?? null;
    }

    let stadium: any = null;
    if (match.stadium_id) {
      const rows: any[] = await sb(
        `stadiums?id=eq.${match.stadium_id}&select=nome,cidade`,
      );
      stadium = rows?.[0] ?? null;
    }

    let fonte: "cache" | "api" | "indisponivel" = match.estatisticas ? "cache" : "indisponivel";
    let estatisticas = match.estatisticas ?? null;
    let escalacoes = match.escalacoes ?? null;

    if (match.status === "encerrado" && !estatisticas && API_FOOTBALL_KEY) {
      try {
        const fixtureId = await resolveFixtureId(
          match,
          homeTeam?.codigo_api ?? null,
          awayTeam?.codigo_api ?? null,
        );
        if (fixtureId) {
          const [statsRes, lineupsRes] = await Promise.all([
            apiFootball(`/fixtures/statistics?fixture=${fixtureId}`).catch((e) => {
              console.warn("stats falhou", e);
              return null;
            }),
            apiFootball(`/fixtures/lineups?fixture=${fixtureId}`).catch((e) => {
              console.warn("lineups falhou", e);
              return null;
            }),
          ]);
          estatisticas = statsRes?.response ?? null;
          escalacoes = lineupsRes?.response ?? null;
          if (estatisticas || escalacoes) {
            await sb(`matches?id=eq.${match.id}`, {
              method: "PATCH",
              body: JSON.stringify({ estatisticas, escalacoes }),
            });
            fonte = "api";
          }
        }
      } catch (e) {
        console.warn("falha fetch api-football", e);
      }
    }

    return json({
      match: {
        id: match.id,
        numero_jogo: match.numero_jogo,
        data_jogo: match.data_jogo,
        peso: match.peso,
        estadio: stadium?.nome ?? match.estadio ?? null,
        cidade: stadium?.cidade ?? match.cidade ?? null,
        status: match.status,
        fase: match.fase,
        placar_casa: match.placar_casa,
        placar_fora: match.placar_fora,
        placar_casa_prorrogacao: match.placar_casa_prorrogacao,
        placar_fora_prorrogacao: match.placar_fora_prorrogacao,
        penaltis_casa: match.penaltis_casa,
        penaltis_fora: match.penaltis_fora,
        home_team: homeTeam
          ? { nome_pt: homeTeam.nome_pt, bandeira_emoji: homeTeam.bandeira_emoji }
          : { nome_pt: match.casa ?? match.slot_casa ?? "?", bandeira_emoji: "" },
        away_team: awayTeam
          ? { nome_pt: awayTeam.nome_pt, bandeira_emoji: awayTeam.bandeira_emoji }
          : { nome_pt: match.fora ?? match.slot_visitante ?? "?", bandeira_emoji: "" },
        eventos: match.eventos ?? [],
      },
      estatisticas,
      escalacoes,
      fonte_stats: fonte,
    });
  } catch (e: any) {
    console.error("get-match-details error", e);
    return json({ error: e?.message ?? "internal_error" }, 500);
  }
});
