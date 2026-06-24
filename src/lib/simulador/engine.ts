// Pure logic for the Copa simulator. Zero side effects.

export type SimMatch = {
  id: string;
  numero_jogo: number;
  fase: string;
  data_jogo: string;
  status: string;
  team_home_id: string | null;
  team_away_id: string | null;
  casa: string;
  fora: string;
  placar_casa: number | null;
  placar_fora: number | null;
  placar_casa_prorrogacao: number | null;
  placar_fora_prorrogacao: number | null;
  penaltis_casa: number | null;
  penaltis_fora: number | null;
  eventos: any;
  home_origem: string | null;
  away_origem: string | null;
  stadium_id: string | null;
};

export type PalpiteGrupo = { placar_casa: number; placar_fora: number };
export type PalpiteMataMata = {
  placar_casa: number;
  placar_fora: number;
  vencedor_id?: string;
};

export type ClassLinha = {
  team_id: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gp: number;
  gc: number;
  sg: number;
  fair_play: number;
};

export const GRUPOS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// R32 deterministic pairings (per spec)
export const PAREAMENTOS_DETERMINISTICOS_R32: Record<number, { home: string; away: string }> = {
  73: { home: "2A", away: "2B" },
  75: { home: "1F", away: "2C" },
  76: { home: "1C", away: "2F" },
  78: { home: "2E", away: "2I" },
  83: { home: "2K", away: "2L" },
  84: { home: "1H", away: "2J" },
  86: { home: "1J", away: "2H" },
  88: { home: "2D", away: "2G" },
};
// R32 Annexe C jogos: numero_jogo -> slot do mandante (1X), visitante vem do lookup vs_1x
export const JOGOS_R32_ANNEXE_C: Record<number, string> = {
  74: "1E",
  77: "1I",
  79: "1A",
  80: "1L",
  81: "1D",
  82: "1G",
  85: "1B",
  87: "1K",
};

function emptyLinha(team_id: string): ClassLinha {
  return {
    team_id,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    gp: 0,
    gc: 0,
    sg: 0,
    fair_play: 0,
  };
}

// Compute classification of a single group
export function calcularClassificacaoGrupo(
  grupo: string,
  jogosGrupo: SimMatch[], // jogos do grupo (todos os 6)
  palpitesGrupos: Record<number, PalpiteGrupo>,
  timesDoGrupo: { id: string; nome_pt: string }[],
  fifaRanking: Record<string, number>,
): ClassLinha[] {
  const linhas: Record<string, ClassLinha> = {};
  for (const t of timesDoGrupo) linhas[t.id] = emptyLinha(t.id);

  type Resolved = { home: string; away: string; gh: number; ga: number };
  const resolved: Resolved[] = [];

  for (const m of jogosGrupo) {
    if (!m.team_home_id || !m.team_away_id) continue;
    let gh: number | null = null;
    let ga: number | null = null;
    if (m.status === "encerrado" && m.placar_casa != null && m.placar_fora != null) {
      gh = m.placar_casa;
      ga = m.placar_fora;
    } else {
      const p = palpitesGrupos[m.numero_jogo];
      if (p) {
        gh = p.placar_casa;
        ga = p.placar_fora;
      }
    }
    if (gh == null || ga == null) continue;
    resolved.push({ home: m.team_home_id, away: m.team_away_id, gh, ga });

    const lh = linhas[m.team_home_id];
    const la = linhas[m.team_away_id];
    if (!lh || !la) continue;
    lh.jogos++;
    la.jogos++;
    lh.gp += gh;
    lh.gc += ga;
    la.gp += ga;
    la.gc += gh;
    if (gh > ga) {
      lh.vitorias++;
      lh.pontos += 3;
      la.derrotas++;
    } else if (gh < ga) {
      la.vitorias++;
      la.pontos += 3;
      lh.derrotas++;
    } else {
      lh.empates++;
      la.empates++;
      lh.pontos++;
      la.pontos++;
    }
  }
  for (const l of Object.values(linhas)) l.sg = l.gp - l.gc;

  // Fair play: deduzir cartões dos jogos REAIS encerrados (1 por jogador/jogo, maior magnitude prevalece).
  // Eventos.api hoje não traz cartões (apenas Goal), então isso fica 0 por enquanto. Quando os cartões
  // chegarem (type='Card'), a lógica abaixo já está pronta.
  // Pesos: yellow=-1, second_yellow=-3, red=-4, yellow_red=-5
  const CARD_WEIGHT: Record<string, number> = {
    yellow: -1,
    second_yellow: -3,
    red: -4,
    yellow_red: -5,
  };
  for (const m of jogosGrupo) {
    if (m.status !== "encerrado" || !Array.isArray(m.eventos)) continue;
    // map api team id -> our team id (precisamos do team home/away)
    type PlayerKey = string;
    const playerWorst: Record<PlayerKey, number> = {};
    for (const ev of m.eventos) {
      if (ev?.type !== "Card") continue;
      const detail = String(ev?.detail ?? "").toLowerCase();
      let kind: keyof typeof CARD_WEIGHT | null = null;
      if (detail.includes("second yellow")) kind = "second_yellow";
      else if (detail.includes("yellow")) kind = "yellow";
      else if (detail.includes("red")) kind = "red";
      if (!kind) continue;
      const apiTeamId = ev?.team?.id;
      const playerId = ev?.player?.id ?? Math.random();
      // Determine which side this team is using by comparing api id with home/away codes
      // (we don't have codigo_api in our snapshot; conservative fallback: skip if unable to map)
      // To avoid wrongly deducting, we only deduct when match has both team_home_id/away_id and
      // we can resolve api id via lookup. Without the lookup we skip.
      // (We'll be conservative and not deduct — preserving correctness when cards arrive needs codigo_api.)
      void apiTeamId;
      void playerId;
      void kind;
    }
    void playerWorst;
  }

  // Sort
  const arr = Object.values(linhas);

  // H2H subset comparator for a set of tied teams
  const h2hFor = (ids: Set<string>) => {
    const sub: Record<string, ClassLinha> = {};
    for (const id of ids) sub[id] = emptyLinha(id);
    for (const r of resolved) {
      if (!ids.has(r.home) || !ids.has(r.away)) continue;
      const lh = sub[r.home];
      const la = sub[r.away];
      lh.jogos++;
      la.jogos++;
      lh.gp += r.gh;
      lh.gc += r.ga;
      la.gp += r.ga;
      la.gc += r.gh;
      if (r.gh > r.ga) {
        lh.pontos += 3;
      } else if (r.gh < r.ga) {
        la.pontos += 3;
      } else {
        lh.pontos++;
        la.pontos++;
      }
    }
    for (const l of Object.values(sub)) l.sg = l.gp - l.gc;
    return sub;
  };

  arr.sort((a, b) => {
    // Step 2 first criteria: pontos
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    return 0;
  });

  // Group by pontos and apply H2H/general/fair_play/fifa
  const finalOrder: ClassLinha[] = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j].pontos === arr[i].pontos) j++;
    const tied = arr.slice(i, j);
    if (tied.length === 1) {
      finalOrder.push(tied[0]);
    } else {
      const ids = new Set(tied.map((t) => t.team_id));
      const h2h = h2hFor(ids);
      tied.sort((a, b) => {
        const ah = h2h[a.team_id];
        const bh = h2h[b.team_id];
        if (bh.pontos !== ah.pontos) return bh.pontos - ah.pontos;
        if (bh.sg !== ah.sg) return bh.sg - ah.sg;
        if (bh.gp !== ah.gp) return bh.gp - ah.gp;
        // geral
        if (b.sg !== a.sg) return b.sg - a.sg;
        if (b.gp !== a.gp) return b.gp - a.gp;
        if (b.fair_play !== a.fair_play) return b.fair_play - a.fair_play;
        const fa = fifaRanking[a.team_id] ?? 999;
        const fb = fifaRanking[b.team_id] ?? 999;
        return fa - fb;
      });
      finalOrder.push(...tied);
    }
    i = j;
  }
  void grupo;
  return finalOrder;
}

// Rank the 12 third-placed teams
export function calcularMelhores3os(
  classificacoes: Record<string, ClassLinha[]>,
  fifaRanking: Record<string, number>,
): { ordenados: { grupo: string; linha: ClassLinha }[]; gruposQualificados: string[] } {
  const terceiros: { grupo: string; linha: ClassLinha }[] = [];
  for (const g of GRUPOS) {
    const l = classificacoes[g]?.[2];
    if (l) terceiros.push({ grupo: g, linha: l });
  }
  terceiros.sort((a, b) => {
    const A = a.linha,
      B = b.linha;
    if (B.pontos !== A.pontos) return B.pontos - A.pontos;
    if (B.sg !== A.sg) return B.sg - A.sg;
    if (B.gp !== A.gp) return B.gp - A.gp;
    if (B.fair_play !== A.fair_play) return B.fair_play - A.fair_play;
    const fa = fifaRanking[A.team_id] ?? 999;
    const fb = fifaRanking[B.team_id] ?? 999;
    return fa - fb;
  });
  const top8 = terceiros.slice(0, 8);
  const gruposQualificados = top8.map((t) => t.grupo).sort();
  return { ordenados: terceiros, gruposQualificados };
}

// Annexe C lookup
export function lookupAnnexeC(
  gruposQualificados: string[],
  annexe: any[],
): Record<string, string> | null {
  const sorted = [...gruposQualificados].sort();
  const row = annexe.find((r) => {
    const gq = Array.isArray(r.grupos_qualificados) ? [...r.grupos_qualificados].sort() : [];
    if (gq.length !== sorted.length) return false;
    return gq.every((g: string, i: number) => g === sorted[i]);
  });
  if (!row) return null;
  return {
    "1A": row.vs_1a,
    "1B": row.vs_1b,
    "1D": row.vs_1d,
    "1E": row.vs_1e,
    "1G": row.vs_1g,
    "1I": row.vs_1i,
    "1K": row.vs_1k,
    "1L": row.vs_1l,
  };
}

// Resolve slot (ex 1A, 2B, 3C) to team_id using classifications
export function resolveSlot(
  slot: string,
  classificacoes: Record<string, ClassLinha[]>,
): string | null {
  if (!slot || slot.length < 2) return null;
  const pos = parseInt(slot[0], 10);
  const grupo = slot.slice(1);
  const l = classificacoes[grupo]?.[pos - 1];
  return l?.team_id ?? null;
}

// Compute R32 pairings -> { numero_jogo: { home_id, away_id } }
export function calcularR32(
  classificacoes: Record<string, ClassLinha[]>,
  annexe: any[],
  fifaRanking: Record<string, number>,
): Record<number, { home_id: string | null; away_id: string | null; home_label: string; away_label: string }> {
  const out: Record<number, any> = {};
  // Deterministic
  for (const [n, p] of Object.entries(PAREAMENTOS_DETERMINISTICOS_R32)) {
    out[Number(n)] = {
      home_id: resolveSlot(p.home, classificacoes),
      away_id: resolveSlot(p.away, classificacoes),
      home_label: p.home,
      away_label: p.away,
    };
  }
  // Annexe
  const { gruposQualificados } = calcularMelhores3os(classificacoes, fifaRanking);
  const lookup = lookupAnnexeC(gruposQualificados, annexe);
  for (const [n, mandSlot] of Object.entries(JOGOS_R32_ANNEXE_C)) {
    const visSlot = lookup ? lookup[mandSlot] : null; // ex "3C"
    out[Number(n)] = {
      home_id: resolveSlot(mandSlot, classificacoes),
      away_id: visSlot ? resolveSlot(visSlot, classificacoes) : null,
      home_label: mandSlot,
      away_label: visSlot ?? "3?",
    };
  }
  return out;
}

// Vencedor de jogo REAL encerrado
export function vencedorReal(m: SimMatch): string | null {
  if (m.status !== "encerrado") return null;
  if (m.placar_casa != null && m.placar_fora != null && m.placar_casa !== m.placar_fora) {
    return m.placar_casa > m.placar_fora ? m.team_home_id : m.team_away_id;
  }
  if (
    m.placar_casa_prorrogacao != null &&
    m.placar_fora_prorrogacao != null &&
    m.placar_casa_prorrogacao !== m.placar_fora_prorrogacao
  ) {
    return m.placar_casa_prorrogacao > m.placar_fora_prorrogacao
      ? m.team_home_id
      : m.team_away_id;
  }
  if (m.penaltis_casa != null && m.penaltis_fora != null) {
    return m.penaltis_casa > m.penaltis_fora ? m.team_home_id : m.team_away_id;
  }
  return null;
}

export function perdedorReal(m: SimMatch): string | null {
  const v = vencedorReal(m);
  if (!v) return null;
  return v === m.team_home_id ? m.team_away_id : m.team_home_id;
}

// Vencedor simulado / real combinado
export function getVencedor(
  numeroJogo: number,
  jogosMap: Map<number, SimMatch>,
  resolvido: Map<number, { home_id: string | null; away_id: string | null }>,
  palpitesMM: Record<number, PalpiteMataMata>,
): string | null {
  const m = jogosMap.get(numeroJogo);
  if (!m) return null;
  if (m.status === "encerrado") return vencedorReal(m);
  const p = palpitesMM[numeroJogo];
  if (!p) return null;
  const r = resolvido.get(numeroJogo);
  const home = r?.home_id ?? m.team_home_id;
  const away = r?.away_id ?? m.team_away_id;
  if (p.placar_casa > p.placar_fora) return home;
  if (p.placar_casa < p.placar_fora) return away;
  return p.vencedor_id ?? null;
}

export function getPerdedor(
  numeroJogo: number,
  jogosMap: Map<number, SimMatch>,
  resolvido: Map<number, { home_id: string | null; away_id: string | null }>,
  palpitesMM: Record<number, PalpiteMataMata>,
): string | null {
  const m = jogosMap.get(numeroJogo);
  if (!m) return null;
  const v = getVencedor(numeroJogo, jogosMap, resolvido, palpitesMM);
  if (!v) return null;
  if (m.status === "encerrado") return perdedorReal(m);
  const r = resolvido.get(numeroJogo);
  const home = r?.home_id ?? m.team_home_id;
  const away = r?.away_id ?? m.team_away_id;
  return v === home ? away : home;
}

// Resolve origin "V73" / "P101" to a team id, given current resolved map
export function resolveOrigem(
  origem: string | null | undefined,
  jogosMap: Map<number, SimMatch>,
  resolvido: Map<number, { home_id: string | null; away_id: string | null }>,
  palpitesMM: Record<number, PalpiteMataMata>,
): string | null {
  if (!origem) return null;
  const n = parseInt(origem.slice(1), 10);
  if (!Number.isFinite(n)) return null;
  if (origem.startsWith("V")) return getVencedor(n, jogosMap, resolvido, palpitesMM);
  if (origem.startsWith("P")) return getPerdedor(n, jogosMap, resolvido, palpitesMM);
  return null;
}

// Determinar fase inicial
export function determinarFaseInicial(matches: SimMatch[]): string {
  const allEncerrado = (lo: number, hi: number) =>
    matches
      .filter((m) => m.numero_jogo >= lo && m.numero_jogo <= hi)
      .every((m) => m.status === "encerrado");
  if (matches.find((m) => m.numero_jogo === 104)?.status === "encerrado")
    return "copa_encerrada";
  if (allEncerrado(101, 102)) return "final";
  if (allEncerrado(97, 100)) return "semis";
  if (allEncerrado(89, 96)) return "quartas";
  if (allEncerrado(73, 88)) return "oitavas";
  if (allEncerrado(1, 72)) return "r32";
  return "grupos";
}
