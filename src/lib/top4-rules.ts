export type Top4Regra = {
  fase: string;
  label: string;
  eficacia: number;
  max_pontos: number;
  bloqueada: boolean;
};

export const TOP4_REGRA_DEFAULT: Top4Regra[] = [
  { fase: "antes_copa", label: "Antes da Copa", eficacia: 100, max_pontos: 4000, bloqueada: false },
  { fase: "grupos", label: "Fase de grupos", eficacia: 50, max_pontos: 2000, bloqueada: false },
  { fase: "round_32", label: "Round of 32", eficacia: 25, max_pontos: 1000, bloqueada: false },
  { fase: "oitavas", label: "Oitavas", eficacia: 0, max_pontos: 0, bloqueada: true },
  { fase: "quartas", label: "Quartas", eficacia: 0, max_pontos: 0, bloqueada: true },
  { fase: "semis", label: "Semis", eficacia: 0, max_pontos: 0, bloqueada: true },
  { fase: "final", label: "Final", eficacia: 0, max_pontos: 0, bloqueada: true },
];

export function getRegraDaFase(fase: string | null | undefined, regras: Top4Regra[] = TOP4_REGRA_DEFAULT): Top4Regra {
  return regras.find((r) => r.fase === fase) ?? regras[0];
}
