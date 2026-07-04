// Lógica de cálculo do potencial máximo do Top 4 considerando o chaveamento
// do mata-mata. Tudo client-side; não escreve nada no banco.
//
// ⚠️ ATENÇÃO: a edge function supabase/functions/snapshot-top4-potenciais-iniciais
// tem uma cópia desse algoritmo (Deno) para o SNAPSHOT INICIAL (fim dos grupos,
// nenhum mata-mata jogado). As mudanças desta rodada (P.2-fix-2) tratam de
// eliminações pós-R32, então NÃO precisam ser portadas para a edge function.
// Mas se um dia mudar a derivação base de chaveamento, FIXE LÁ TAMBÉM.

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
  placar_casa?: number | null;
  placar_fora?: number | null;
  placar_casa_prorrogacao?: number | null;
  placar_fora_prorrogacao?: number | null;
  penaltis_casa?: number | null;
  penaltis_fora?: number | null;
};

type TeamLike = { id: string; bracket_position: string };

/**
 * Calcula o vencedor de um jogo encerrado considerando 90', prorrogação e
 * pênaltis. Retorna null se não houver vencedor determinável (jogo em aberto
 * ou empate sem desempate).
 */
export function vencedorDoJogo(m: MatchLike): string | null {
  if (m.status !== "encerrado") return null;
  const home = m.team_home_id;
  const away = m.team_away_id;
  if (!home || !away) return null;

  const pc = m.placar_casa ?? null;
  const pf = m.placar_fora ?? null;
  if (pc != null && pf != null) {
    if (pc > pf) return home;
    if (pf > pc) return away;
  }
  const pcp = m.placar_casa_prorrogacao ?? null;
  const pfp = m.placar_fora_prorrogacao ?? null;
  if (pcp != null && pfp != null) {
    if (pcp > pfp) return home;
    if (pfp > pcp) return away;
  }
  const penc = m.penaltis_casa ?? null;
  const penf = m.penaltis_fora ?? null;
  if (penc != null && penf != null) {
    if (penc > penf) return home;
    if (penf > penc) return away;
  }
  return null;
}

/**
 * Deriva as 4 chaves (A/B/C/D) → conjuntos de team_ids — caminhando do
 * mata-mata pra trás (semis → quartas → oitavas → R32).
 *
 * Mapping fixo de lados (FIFA 2026):
 *  - M101 (semi 1) = chaves A+B (lado "cima")
 *  - M102 (semi 2) = chaves C+D (lado "baixo")
 */
export function derivarChaveamento(matches: MatchLike[]): {
  chaves: Record<Chave, Set<string>>;
  ladoDaChave: Record<Chave, Lado>;
  quartaPorChave: Record<Chave, number | null>;
} | null {
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

  const semi1Quartas = quartasDe(101);
  const semi2Quartas = quartasDe(102);
  if (semi1Quartas.length !== 2 || semi2Quartas.length !== 2) return null;

  const ordemChaves: Array<{ chave: Chave; lado: Lado; quartaNum: number }> = [
    { chave: "A", lado: "cima", quartaNum: semi1Quartas[0] },
    { chave: "B", lado: "cima", quartaNum: semi1Quartas[1] },
    { chave: "C", lado: "baixo", quartaNum: semi2Quartas[0] },
    { chave: "D", lado: "baixo", quartaNum: semi2Quartas[1] },
  ];

  const chaves: Record<Chave, Set<string>> = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };
  const ladoDaChave: Record<Chave, Lado> = { A: "cima", B: "cima", C: "baixo", D: "baixo" };
  const quartaPorChave: Record<Chave, number | null> = { A: null, B: null, C: null, D: null };

  for (const { chave, lado, quartaNum } of ordemChaves) {
    ladoDaChave[chave] = lado;
    quartaPorChave[chave] = quartaNum;
    const r32s = r32sDeQuarta(quartaNum);
    for (const r32Num of r32s) {
      const r32 = byNumero.get(r32Num);
      if (!r32) continue;
      if (r32.team_home_id) chaves[chave].add(r32.team_home_id);
      if (r32.team_away_id) chaves[chave].add(r32.team_away_id);
    }
  }

  return { chaves, ladoDaChave, quartaPorChave };
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

/**
 * Calcula o potencial máximo (em pts) do Top 4 enumerando cenários
 * do bracket — agora considerando jogos do mata-mata já encerrados:
 *  - Times que perderam em R32/oitavas/quartas: eliminados de qualquer slot.
 *  - Times que perderam semi (M101/M102): só podem ser 3º ou 4º.
 *  - Se 3º lugar (M103) ou final (M104) encerrados: posições travadas.
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

  const byNumero = new Map<number, MatchLike>();
  for (const m of matches) if (m.numero_jogo != null) byNumero.set(m.numero_jogo, m);

  // Eliminações
  const eliminadosFull = new Set<string>(); // não pode aparecer em nenhum slot
  const eliminadosTopDois = new Set<string>(); // perdeu semi → só 3º/4º
  for (let n = 73; n <= 102; n++) {
    const m = byNumero.get(n);
    if (!m || m.status !== "encerrado") continue;
    const venc = vencedorDoJogo(m);
    if (!venc || !m.team_home_id || !m.team_away_id) continue;
    const perdedor = venc === m.team_home_id ? m.team_away_id : m.team_home_id;
    if (n === 101 || n === 102) eliminadosTopDois.add(perdedor);
    else eliminadosFull.add(perdedor);
  }

  // Posições já travadas
  const m103 = byNumero.get(103);
  const m104 = byNumero.get(104);
  const terceiroReal =
    m103 && m103.status === "encerrado" ? vencedorDoJogo(m103) : null;
  const quartoReal =
    terceiroReal && m103
      ? terceiroReal === m103.team_home_id
        ? m103.team_away_id
        : m103.team_home_id
      : null;
  const campeaoReal =
    m104 && m104.status === "encerrado" ? vencedorDoJogo(m104) : null;
  const viceReal =
    campeaoReal && m104
      ? campeaoReal === m104.team_home_id
        ? m104.team_away_id
        : m104.team_home_id
      : null;

  const idDeBp = new Map(teams.map((t) => [t.bracket_position, t.id]));
  const picksTeamIds: Record<SlotKey, string> = {
    campeao: idDeBp.get(picks.campeao) ?? PLACEHOLDER,
    vice: idDeBp.get(picks.vice) ?? PLACEHOLDER,
    terceiro: idDeBp.get(picks.terceiro) ?? PLACEHOLDER,
    quarto: idDeBp.get(picks.quarto) ?? PLACEHOLDER,
  };

  const teamIds = SLOTS.map((s) => picksTeamIds[s]).filter((id) => id !== PLACEHOLDER);

  // Candidatos por chave
  const candidatos: Record<Chave, string[]> = { A: [], B: [], C: [], D: [] };
  for (const c of ["A", "B", "C", "D"] as Chave[]) {
    const quartaNum = chav.quartaPorChave[c];
    const quarta = quartaNum != null ? byNumero.get(quartaNum) : null;
    if (quarta && quarta.status === "encerrado") {
      const venc = vencedorDoJogo(quarta);
      // Semifinalista da chave é determinístico: o vencedor da quarta.
      // Só interessa se for um time do pereba.
      if (venc && teamIds.includes(venc)) {
        candidatos[c] = [venc];
      } else {
        candidatos[c] = [];
      }
    } else {
      // Semifinalista TBD: qualquer time do pereba ainda vivo nesta chave
      candidatos[c] = teamIds.filter(
        (t) => chav.chaves[c].has(t) && !eliminadosFull.has(t),
      );
    }
  }

  const opcoes = (c: Chave) => (candidatos[c].length > 0 ? candidatos[c] : [PLACEHOLDER]);
  const fator = pesoPercentual / 100;
  let melhor = 0;

  const slotPermitido = (slot: SlotKey, teamId: string): boolean => {
    if (teamId === PLACEHOLDER) return true;
    if (slot === "campeao" || slot === "vice") {
      if (eliminadosTopDois.has(teamId)) return false;
    }
    if (slot === "campeao" && campeaoReal && teamId !== campeaoReal) return false;
    if (slot === "vice" && viceReal && teamId !== viceReal) return false;
    if (slot === "terceiro" && terceiroReal && teamId !== terceiroReal) return false;
    if (slot === "quarto" && quartoReal && teamId !== quartoReal) return false;
    return true;
  };

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
                  if (!slotPermitido("campeao", campeao)) continue;
                  if (!slotPermitido("vice", vice)) continue;
                  if (!slotPermitido("terceiro", terceiro)) continue;
                  if (!slotPermitido("quarto", quarto)) continue;
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

// Backward-compat
export const calcularPotencialMaximo = calcularPotencialMaximoTop4;

export function mensagemPorPotencial(pts: number): string {
  if (pts >= 4000) return "🏆 Cenário perfeito ainda possível!";
  if (pts >= 2000) return "🔥 Muito bom — top 4 quase intacto.";
  if (pts >= 1000) return "👍 Bom — alguns conflitos no bracket, mas dá pra somar pontos.";
  if (pts >= 500) return "⚠️ Atenção: máximo de 1 time em posição certa ainda viável.";
  if (pts > 0) return "💔 Reduzido — só posições erradas dentro do top 4 são possíveis.";
  return "🚫 Nenhum dos seus times está mais no mata-mata.";
}
