// ============================================================
// Lookup table de seleções (UI estática, mantida)
// ============================================================
export type Time = { nome: string; sigla: string; bandeira: string };

export const times: Record<string, Time> = {
  BRA: { nome: "Brasil", sigla: "BRA", bandeira: "🇧🇷" },
  ARG: { nome: "Argentina", sigla: "ARG", bandeira: "🇦🇷" },
  FRA: { nome: "França", sigla: "FRA", bandeira: "🇫🇷" },
  ESP: { nome: "Espanha", sigla: "ESP", bandeira: "🇪🇸" },
  ALE: { nome: "Alemanha", sigla: "ALE", bandeira: "🇩🇪" },
  ING: { nome: "Inglaterra", sigla: "ING", bandeira: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  POR: { nome: "Portugal", sigla: "POR", bandeira: "🇵🇹" },
  EUA: { nome: "Estados Unidos", sigla: "EUA", bandeira: "🇺🇸" },
  MEX: { nome: "México", sigla: "MEX", bandeira: "🇲🇽" },
  CAN: { nome: "Canadá", sigla: "CAN", bandeira: "🇨🇦" },
  URU: { nome: "Uruguai", sigla: "URU", bandeira: "🇺🇾" },
  HOL: { nome: "Holanda", sigla: "HOL", bandeira: "🇳🇱" },
};

// ============================================================
// Tipos derivados ainda usados em componentes
// ============================================================
export type Jogo = {
  id: string;
  fase: string;
  data: string;
  hora: string;
  estadio: string;
  cidade: string;
  casa: string;
  fora: string;
  peso: number;
  status: "agendado" | "ao-vivo" | "encerrado";
  placarCasa?: number;
  placarFora?: number;
  meuPalpiteCasa?: number;
  meuPalpiteFora?: number;
  travaEm?: string;
};

export type Participante = {
  id: string;
  nome: string;
  apelido: string;
  cor: string;
  pontos: number;
  variacao: number;
  exatos: number;
  quotas: number;
  evolucao?: number[];
  palpites_validos: number;
  palpites_possiveis: number;
  elegivel_lanterna: boolean;
};

export type Quota = {
  id: string;
  numero: number;
  status: "ativa" | "aguardando_aprovacao" | "expirada";
  pagaEm?: string;
  pontos: number;
  posicao: number;
  palpites_validos: number;
  palpites_possiveis: number;
  elegivel_lanterna: boolean;
};

export type DistribuicaoItem = {
  id: "primeiro" | "segundo" | "terceiro" | "lanterna";
  label: string;
  pct: number;
};

export type Premio = {
  total_confirmado: number;
  total_pendente: number;
  meta: number;
  quotas_pagas: number;
  quotas_pendentes: number;
  atualizado_em: string;
  evolucao: { data: string; valor: number }[];
  distribuicao: DistribuicaoItem[];
  ultimasConfirmacoes: { quota: string; valor: number; ha: string }[];
};

export type PerfilPersonalidade = {
  participante_id: string;
  apelido_principal: string;
  apelidos_alternativos: string[];
  tracos: { traco: string; brincadeira: string }[];
  tags: string[];
  observacoes_admin: string;
};

export type Boletim = {
  id: string;
  data: string;
  titulo: string;
  conteudo: string;
  conteudo_original?: string;
  status: "publicado" | "rascunho" | "agendado";
  publicado_em?: string;
  agendado_para?: string;
};

// ============================================================
// Fallback de geração de boletim (mock até a Rodada F)
// ============================================================
export function gerarBoletimMock(
  rankingDoDia: Participante[] = [],
  perfisAtivos: PerfilPersonalidade[] = [],
): { titulo: string; conteudo: string } {
  const sorted = [...rankingDoDia];
  if (sorted.length === 0) {
    return { titulo: "Boletim do dia", conteudo: "Sem movimentação na perebada hoje." };
  }
  const top3 = sorted.slice(0, 3);
  const maiorSubida = [...sorted].sort((a, b) => b.variacao - a.variacao)[0];
  const maiorQueda = [...sorted].sort((a, b) => a.variacao - b.variacao)[0];

  const refDe = (p: Participante) => {
    const perfil = perfisAtivos.find((x) => x.participante_id === p.id);
    if (!perfil) return p.nome;
    const alt = perfil.apelidos_alternativos[0];
    return alt ? perfil.apelido_principal + " (" + alt + ")" : perfil.apelido_principal;
  };
  const brincadeira = (p: Participante) => {
    const perfil = perfisAtivos.find((x) => x.participante_id === p.id);
    return perfil?.tracos[0]?.brincadeira ?? "sem comentários hoje";
  };

  const lider = top3[0];
  const segundo = top3[1];
  const terceiro = top3[2];

  const partes: string[] = [];
  if (lider) partes.push(refDe(lider) + " segue na ponta com " + lider.pontos.toLocaleString("pt-BR") + " pts — " + brincadeira(lider) + ".");
  if (segundo && terceiro) partes.push(refDe(segundo) + " cola em segundo, e " + refDe(terceiro) + " fecha o pódio.");
  if (maiorSubida && maiorSubida.variacao > 0) partes.push("Quem mais subiu hoje foi " + refDe(maiorSubida) + ", +" + maiorSubida.variacao + " posições.");
  if (maiorQueda && maiorQueda.variacao < 0) partes.push("Já " + refDe(maiorQueda) + " despencou " + Math.abs(maiorQueda.variacao) + " — " + brincadeira(maiorQueda) + ".");

  const conteudo = partes.join(" ") || "Dia tranquilo na perebada — sem grandes reviravoltas.";
  const titulo = lider ? refDe(lider) + " na ponta, perebada acompanha" : "Boletim do dia";

  return { titulo, conteudo };
}
