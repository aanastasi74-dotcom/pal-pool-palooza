// Regras de elegibilidade ao prêmio do lanterninha (5%).
// Mantido desacoplado para futura migração a função SQL/view no Supabase.

export const ENGAJAMENTO_MIN = 0.8;
export const PONTOS_MIN = 200;

export type QuotaElegibilidade = {
  palpites_validos: number;
  palpites_possiveis: number;
  pontos: number;
};

export function calcularEngajamento(palpites_validos: number, palpites_possiveis: number): number {
  if (palpites_possiveis === 0) return 0;
  return palpites_validos / palpites_possiveis;
}

export function isElegivelLanterna(quota: QuotaElegibilidade): boolean {
  const eng = calcularEngajamento(quota.palpites_validos, quota.palpites_possiveis);
  return eng >= ENGAJAMENTO_MIN && quota.pontos >= PONTOS_MIN;
}

export function razaoNaoElegivel(quota: QuotaElegibilidade): string | null {
  const eng = calcularEngajamento(quota.palpites_validos, quota.palpites_possiveis);
  if (eng < ENGAJAMENTO_MIN && quota.pontos < PONTOS_MIN) return "engajamento e pontuação abaixo do mínimo";
  if (eng < ENGAJAMENTO_MIN) return `engajamento abaixo de ${ENGAJAMENTO_MIN * 100}% (atual: ${(eng * 100).toFixed(0)}%)`;
  if (quota.pontos < PONTOS_MIN) return `pontuação abaixo de ${PONTOS_MIN} (atual: ${quota.pontos})`;
  return null;
}

export function estaNosUltimos25(posicao: number, totalQuotas: number): boolean {
  if (totalQuotas <= 0) return false;
  const corte = Math.ceil(totalQuotas * 0.75);
  return posicao > corte;
}

// Texto integral da regra (para Dialog público e PDF de fechamento).
export const REGRA_LANTERNINHA = `O prêmio do lanterninha vale 5% do prêmio total e é entregue ao último colocado do ranking final, desde que sua quota atenda simultaneamente:

1. Engajamento: pelo menos ${ENGAJAMENTO_MIN * 100}% das partidas em que era possível palpitar receberam palpite válido.
2. Pontuação mínima: ao menos ${PONTOS_MIN} pontos acumulados ao final da Copa.

Palpite válido = ambos os campos de placar preenchidos com inteiros entre 0 e 9, submetidos antes do horário de travamento.

Caso o último colocado não atenda aos critérios, o prêmio sobe para o próximo elegível no ranking. Se ninguém atender, os 5% são redistribuídos proporcionalmente entre 1º, 2º e 3º (60/25/10), resultando na distribuição efetiva 67/27/11.`;

// Calcula a distribuição efetiva caso ninguém seja elegível ao lanterninha.
export function distribuicaoSemLanterna(): { primeiro: number; segundo: number; terceiro: number } {
  // 60+25+10 = 95; redistribuir os 5 proporcionalmente.
  const base = { primeiro: 60, segundo: 25, terceiro: 10 };
  const soma = base.primeiro + base.segundo + base.terceiro;
  return {
    primeiro: Math.round((base.primeiro / soma) * 100),
    segundo: Math.round((base.segundo / soma) * 100),
    terceiro: 100 - Math.round((base.primeiro / soma) * 100) - Math.round((base.segundo / soma) * 100),
  };
}
