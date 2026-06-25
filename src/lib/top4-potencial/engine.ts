// Lógica de cálculo do potencial máximo do Top 4 considerando o chaveamento
// do mata-mata. Tudo client-side; não escreve nada no banco.

export type Top4Picks = {
  // bracket_position codes (ex: "GA1") — mesmo formato salvo em top4_predictions
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
  vencedor?: string | null;
};

type TeamLike = { id: string; bracket_position: string };

/**
 * Deriva as 4 chaves (A/B/C/D) → conjuntos de team_ids — caminhando do
 * mata-mata pra trás (semis → quartas → oitavas → R32).
 *
 * Mapping fixo de lados (FIFA 2026):
 *  - M101 (semi 1) = chaves A+B (lado "cima")
 *  - M102 (semi 2) = chaves C+D (lado "baixo")
 *
 * Cada quarta vira uma chave; identificamos quais R32 alimentam cada uma e
 * coletamos os times resolvidos.
 */
export function derivarChaveamento(matches: MatchLike[]): {
  chaves: Record<Chave, Set<string>>;
  ladoDaChave: Record<Chave, Lado>;
} | null {
  const byNumero = new Map<number, MatchLike>();
  for (const m of matches) if (m.numero_jogo != null) byNumero.set(m.numero_jogo, m);

  // Quartas alimentando cada semi (em ordem de aparição em home_origem/away_origem)
  const quartasDe = (semiNum: number): number[] => {
    const semi = byNumero.get(semiNum);
    if (!semi) return [];
    return [semi.home_origem, semi.away_origem]
      .filter((o): o is string => !!o && o.startsWith("V"))
      .map((o) => Number(o.slice(1)));
  };

  // R32s alimentando uma quarta (via oitavas no meio)
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

  const semi1Quartas = quartasDe(101); // chaves A,B
  const semi2Quartas = quartasDe(102); // chaves C,D
  if (semi1Quartas.length !== 2 || semi2Quartas.length !== 2) return null;

  const ordemChaves: Array<{ chave: Chave; lado: Lado; quartaNum: number }> = [
    { chave: "A", lado: "cima", quartaNum: semi1Quartas[0] },
    { chave: "B", lado: "cima", quartaNum: semi1Quartas[1] },
    { chave: "C", lado: "baixo", quartaNum: semi2Quartas[0] },
    { chave: "D", lado: "baixo", quartaNum: semi2Quartas[1] },
  ];

  const chaves: Record<Chave, Set<string>> = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };
  const ladoDaChave: Record<Chave, Lado> = { A: "cima", B: "cima", C: "baixo", D: "baixo" };

  for (const { chave, lado, quartaNum } of ordemChaves) {
    ladoDaChave[chave] = lado;
    const r32s = r32sDeQuarta(quartaNum);
    for (const r32Num of r32s) {
      const r32 = byNumero.get(r32Num);
      if (!r32) continue;
      if (r32.team_home_id) chaves[chave].add(r32.team_home_id);
      if (r32.team_away_id) chaves[chave].add(r32.team_away_id);
    }
  }

  return { chaves, ladoDaChave };
}

/** Localiza cada pick (bracket_position) na chave correspondente. */
function localizarPicks(
  picks: Top4Picks,
  teams: TeamLike[],
  chaves: Record<Chave, Set<string>>,
): Record<keyof Top4Picks, Chave | "fora"> {
  const idDeBp = new Map(teams.map((t) => [t.bracket_position, t.id]));
  const loc = {} as Record<keyof Top4Picks, Chave | "fora">;
  for (const k of ["campeao", "vice", "terceiro", "quarto"] as const) {
    const teamId = idDeBp.get(picks[k]);
    if (!teamId) {
      loc[k] = "fora";
      continue;
    }
    const chave = (["A", "B", "C", "D"] as Chave[]).find((c) => chaves[c].has(teamId));
    loc[k] = chave ?? "fora";
  }
  return loc;
}

const VALOR_ACERTO_POSICAO = 1000;
const VALOR_POSICAO_ERRADA = 400;

/**
 * Calcula o potencial máximo (em pts) do Top 4 do pereba dado o chaveamento.
 * Enumera todas as 24 permutações; mantém só as viáveis no bracket.
 */
export function calcularPotencialMaximo(
  picks: Top4Picks,
  matches: MatchLike[],
  teams: TeamLike[],
  pesoPercentual: number,
): { pontos: number; faseGruposCompleta: boolean } {
  const faseGruposCompleta = matches
    .filter((m) => m.numero_jogo != null && m.numero_jogo >= 1 && m.numero_jogo <= 72)
    .every((m) => m.status === "encerrado");

  if (!faseGruposCompleta) return { pontos: 0, faseGruposCompleta: false };

  const chav = derivarChaveamento(matches);
  if (!chav) return { pontos: 0, faseGruposCompleta };

  const loc = localizarPicks(picks, teams, chav.chaves);
  const fator = pesoPercentual / 100;

  const slots = ["campeao", "vice", "terceiro", "quarto"] as const;
  const valores = picks;

  const permutar = <T,>(arr: T[]): T[][] => {
    if (arr.length <= 1) return [arr];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permutar(rest)) out.push([arr[i], ...p]);
    }
    return out;
  };

  let melhor = 0;
  const picksDistintos = Array.from(new Set(slots.map((s) => valores[s]).filter(Boolean)));

  for (const perm of permutar(picksDistintos)) {
    // Atribui perm[i] à posição slots[i] (ou nenhum se perm é menor)
    const atrib: Partial<Record<typeof slots[number], string>> = {};
    for (let i = 0; i < perm.length && i < slots.length; i++) atrib[slots[i]] = perm[i];

    // Viabilidade
    let viavel = true;
    const chavesUsadas = new Set<Chave>();
    for (const s of slots) {
      const bp = atrib[s];
      if (!bp) continue;
      const k = slots.find((sl) => valores[sl] === bp)!;
      const cv = loc[k];
      if (cv === "fora") { viavel = false; break; }
      if (chavesUsadas.has(cv)) { viavel = false; break; }
      chavesUsadas.add(cv);
    }
    if (!viavel) continue;

    // Campeão e vice em lados opostos
    const bpCamp = atrib.campeao;
    const bpVice = atrib.vice;
    if (bpCamp && bpVice) {
      const kCamp = slots.find((sl) => valores[sl] === bpCamp)!;
      const kVice = slots.find((sl) => valores[sl] === bpVice)!;
      const ladoC = chav.ladoDaChave[loc[kCamp] as Chave];
      const ladoV = chav.ladoDaChave[loc[kVice] as Chave];
      if (ladoC === ladoV) continue;
    }

    // Pontos: o pick original do pereba pra esse bp vs a posição atribuída
    let pontos = 0;
    for (const s of slots) {
      const bp = atrib[s];
      if (!bp) continue;
      const kOriginal = slots.find((sl) => valores[sl] === bp)!;
      if (kOriginal === s) pontos += VALOR_ACERTO_POSICAO;
      else pontos += VALOR_POSICAO_ERRADA;
    }
    pontos = Math.floor(pontos * fator);
    if (pontos > melhor) melhor = pontos;
  }

  return { pontos: melhor, faseGruposCompleta };
}

export function mensagemPorPotencial(pts: number): string {
  if (pts >= 4000) return "🏆 Cenário perfeito ainda possível!";
  if (pts >= 2000) return "🔥 Muito bom — top 4 quase intacto.";
  if (pts >= 1000) return "👍 Bom — alguns conflitos no bracket, mas dá pra somar pontos.";
  if (pts >= 500) return "⚠️ Atenção: máximo de 1 time em posição certa ainda viável.";
  if (pts > 0) return "💔 Reduzido — só posições erradas dentro do top 4 são possíveis.";
  return "🚫 Nenhum dos seus times está mais no mata-mata.";
}
