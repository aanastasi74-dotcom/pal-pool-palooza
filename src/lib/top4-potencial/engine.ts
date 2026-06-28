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

const VALOR_ACERTO_POSICAO = 1000;
const VALOR_POSICAO_ERRADA = 400;
const PLACEHOLDER = "__placeholder__";

type SlotKey = "campeao" | "vice" | "terceiro" | "quarto";
const SLOTS: SlotKey[] = ["campeao", "vice", "terceiro", "quarto"];

function calcularPontosCenario(
  picksTeamIds: Record<SlotKey, string>,
  cenario: Record<SlotKey, string>,
  fator: number,
): number {
  // mapa teamId -> slot escolhido pelo pereba
  const escolhasPereba = new Map<string, SlotKey>();
  for (const s of SLOTS) escolhasPereba.set(picksTeamIds[s], s);

  // mapa teamId -> slot no cenário real
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

/**
 * Calcula o potencial máximo (em pts) do Top 4 enumerando cenários
 * do bracket (semifinalistas por chave + matchings de final/3º lugar).
 */
export function calcularPotencialMaximoTop4(
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

  const idDeBp = new Map(teams.map((t) => [t.bracket_position, t.id]));
  const picksTeamIds: Record<SlotKey, string> = {
    campeao: idDeBp.get(picks.campeao) ?? PLACEHOLDER,
    vice: idDeBp.get(picks.vice) ?? PLACEHOLDER,
    terceiro: idDeBp.get(picks.terceiro) ?? PLACEHOLDER,
    quarto: idDeBp.get(picks.quarto) ?? PLACEHOLDER,
  };

  // Localiza cada time do pereba em uma chave
  const teamIds = SLOTS.map((s) => picksTeamIds[s]).filter((id) => id !== PLACEHOLDER);
  const localizacao = new Map<string, Chave | "fora">();
  for (const tid of teamIds) {
    const chave = (["A", "B", "C", "D"] as Chave[]).find((c) => chav.chaves[c].has(tid));
    localizacao.set(tid, chave ?? "fora");
  }

  // Candidatos por chave (times do pereba presentes na chave)
  const candidatos: Record<Chave, string[]> = { A: [], B: [], C: [], D: [] };
  for (const tid of teamIds) {
    const loc = localizacao.get(tid);
    if (loc && loc !== "fora") candidatos[loc].push(tid);
  }

  const opcoes = (c: Chave) => (candidatos[c].length > 0 ? candidatos[c] : [PLACEHOLDER]);
  const fator = pesoPercentual / 100;
  let melhor = 0;

  // Enumera 1 semifinalista por chave
  for (const semiA of opcoes("A")) {
    for (const semiB of opcoes("B")) {
      for (const semiC of opcoes("C")) {
        for (const semiD of opcoes("D")) {
          // Semi 1: A vs B; Semi 2: C vs D
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

  return { pontos: melhor, faseGruposCompleta };
}

// Backward-compat: nome antigo usado pelos componentes
export const calcularPotencialMaximo = calcularPotencialMaximoTop4;

export function mensagemPorPotencial(pts: number): string {
  if (pts >= 4000) return "🏆 Cenário perfeito ainda possível!";
  if (pts >= 2000) return "🔥 Muito bom — top 4 quase intacto.";
  if (pts >= 1000) return "👍 Bom — alguns conflitos no bracket, mas dá pra somar pontos.";
  if (pts >= 500) return "⚠️ Atenção: máximo de 1 time em posição certa ainda viável.";
  if (pts > 0) return "💔 Reduzido — só posições erradas dentro do top 4 são possíveis.";
  return "🚫 Nenhum dos seus times está mais no mata-mata.";
}
