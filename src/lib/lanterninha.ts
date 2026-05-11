// Regras de elegibilidade ao prêmio do lanterninha (5%).
// Defaults usados quando settings.lanterninha_rule não está presente.

export const ENGAJAMENTO_MIN_DEFAULT = 0.8;
export const PONTOS_MIN_DEFAULT = 200;

export type LanterninhaRule = {
  engajamento_minimo: number;
  pontos_minimos: number;
};

export const DEFAULT_LANTERNINHA_RULE: LanterninhaRule = {
  engajamento_minimo: ENGAJAMENTO_MIN_DEFAULT,
  pontos_minimos: PONTOS_MIN_DEFAULT,
};

export type QuotaElegibilidade = {
  palpites_validos: number;
  palpites_possiveis: number;
  pontos: number;
};

export function calcularEngajamento(palpites_validos: number, palpites_possiveis: number): number {
  if (palpites_possiveis === 0) return 0;
  return palpites_validos / palpites_possiveis;
}

export function isElegivelLanterna(quota: QuotaElegibilidade, rule: LanterninhaRule = DEFAULT_LANTERNINHA_RULE): boolean {
  const eng = calcularEngajamento(quota.palpites_validos, quota.palpites_possiveis);
  return eng >= rule.engajamento_minimo && quota.pontos >= rule.pontos_minimos;
}

export function razaoNaoElegivel(quota: QuotaElegibilidade, rule: LanterninhaRule = DEFAULT_LANTERNINHA_RULE): string | null {
  const eng = calcularEngajamento(quota.palpites_validos, quota.palpites_possiveis);
  if (eng < rule.engajamento_minimo && quota.pontos < rule.pontos_minimos) return "engajamento e pontuação abaixo do mínimo";
  if (eng < rule.engajamento_minimo) return `engajamento abaixo de ${(rule.engajamento_minimo * 100).toFixed(0)}% (atual: ${(eng * 100).toFixed(0)}%)`;
  if (quota.pontos < rule.pontos_minimos) return `pontuação abaixo de ${rule.pontos_minimos} (atual: ${quota.pontos})`;
  return null;
}

export function estaNosUltimos25(posicao: number, totalQuotas: number): boolean {
  if (totalQuotas <= 0) return false;
  const corte = Math.ceil(totalQuotas * 0.75);
  return posicao > corte;
}

export function regraLanterninhaTexto(rule: LanterninhaRule = DEFAULT_LANTERNINHA_RULE): string {
  return `O prêmio do lanterninha vale 5% do prêmio total e é entregue ao último colocado do ranking final, desde que sua quota atenda simultaneamente:

1. Engajamento: pelo menos ${(rule.engajamento_minimo * 100).toFixed(0)}% das partidas em que era possível palpitar receberam palpite válido.
2. Pontuação mínima: ao menos ${rule.pontos_minimos} pontos acumulados ao final da Copa.

Palpite válido = ambos os campos de placar preenchidos com inteiros entre 0 e 9, submetidos antes do horário de travamento.

Caso o último colocado não atenda aos critérios, o prêmio sobe para o próximo elegível no ranking. Se ninguém atender, os 5% são redistribuídos proporcionalmente entre 1º, 2º e 3º (60/25/10), resultando na distribuição efetiva 67/27/11.`;
}

// Backwards-compat exports
export const ENGAJAMENTO_MIN = ENGAJAMENTO_MIN_DEFAULT;
export const PONTOS_MIN = PONTOS_MIN_DEFAULT;
export const REGRA_LANTERNINHA = regraLanterninhaTexto();

export function distribuicaoSemLanterna(): { primeiro: number; segundo: number; terceiro: number } {
  const base = { primeiro: 60, segundo: 25, terceiro: 10 };
  const soma = base.primeiro + base.segundo + base.terceiro;
  return {
    primeiro: Math.round((base.primeiro / soma) * 100),
    segundo: Math.round((base.segundo / soma) * 100),
    terceiro: 100 - Math.round((base.primeiro / soma) * 100) - Math.round((base.segundo / soma) * 100),
  };
}
