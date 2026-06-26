// Tradução de códigos de procedência (home_origem / away_origem) em matches do mata-mata.
// Ex.: "2B" → "2º Grupo B", "V73" → "Vencedor Jogo 73", "P89" → "Perdedor Jogo 89".

const POSICAO_LABEL: Record<string, string> = { "1": "1º", "2": "2º", "3": "3º" };

export function fmtOrigem(origem: string | null | undefined): string {
  if (!origem) return "";
  if (origem.startsWith("V")) {
    const n = origem.slice(1);
    if (/^\d+$/.test(n)) return `Vencedor Jogo ${n}`;
  }
  if (origem.startsWith("P")) {
    const n = origem.slice(1);
    if (/^\d+$/.test(n)) return `Perdedor Jogo ${n}`;
  }
  const pos = POSICAO_LABEL[origem[0]];
  const grupo = origem.slice(1);
  if (!pos || !grupo) return origem;
  return `${pos} Grupo ${grupo}`;
}
