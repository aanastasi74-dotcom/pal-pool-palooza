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
  travaEm?: string; // ex.: "2h 15min"
};

export const jogos: Jogo[] = [
  { id: "1", fase: "Fase de grupos", data: "11/06", hora: "21:00", estadio: "Estádio Azteca", cidade: "Cidade do México",
    casa: "MEX", fora: "CAN", peso: 10, status: "encerrado", placarCasa: 2, placarFora: 1, meuPalpiteCasa: 2, meuPalpiteFora: 1 },
  { id: "2", fase: "Fase de grupos", data: "12/06", hora: "16:00", estadio: "MetLife Stadium", cidade: "Nova York",
    casa: "EUA", fora: "URU", peso: 11, status: "encerrado", placarCasa: 1, placarFora: 1, meuPalpiteCasa: 2, meuPalpiteFora: 0 },
  { id: "3", fase: "Fase de grupos", data: "13/06", hora: "20:00", estadio: "SoFi Stadium", cidade: "Los Angeles",
    casa: "BRA", fora: "POR", peso: 12, status: "ao-vivo", placarCasa: 2, placarFora: 0, meuPalpiteCasa: 3, meuPalpiteFora: 1 },
  { id: "4", fase: "Fase de grupos", data: "14/06", hora: "13:00", estadio: "Mercedes-Benz Stadium", cidade: "Atlanta",
    casa: "ARG", fora: "HOL", peso: 13, status: "agendado", meuPalpiteCasa: 2, meuPalpiteFora: 1, travaEm: "2h 15min" },
  { id: "5", fase: "Fase de grupos", data: "14/06", hora: "16:00", estadio: "AT&T Stadium", cidade: "Dallas",
    casa: "FRA", fora: "ALE", peso: 13, status: "agendado", travaEm: "5h 40min" },
  { id: "6", fase: "Oitavas", data: "15/06", hora: "19:00", estadio: "BMO Field", cidade: "Toronto",
    casa: "ESP", fora: "ING", peso: 18, status: "agendado", meuPalpiteCasa: 1, meuPalpiteFora: 2, travaEm: "1d 2h" },
  { id: "7", fase: "Quartas", data: "20/06", hora: "16:00", estadio: "SoFi Stadium", cidade: "Los Angeles",
    casa: "BRA", fora: "FRA", peso: 25, status: "agendado", travaEm: "6d" },
];

export type Participante = {
  id: string;
  nome: string;
  apelido: string;
  cor: string;
  pontos: number;
  variacao: number;
  exatos: number;
  quotas: number;
  evolucao?: number[]; // posições recentes para sparkline
  // Elegibilidade ao lanterninha (calculados ao final da Copa):
  palpites_validos: number;
  palpites_possiveis: number;
  elegivel_lanterna: boolean;
};

export const ranking: Participante[] = [
  { id: "1", nome: "Carla Mendes", apelido: "CM", cor: "oklch(0.7 0.17 90)", pontos: 1840, variacao: 2, exatos: 7, quotas: 3, evolucao: [5, 4, 4, 3, 1], palpites_validos: 38, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "2", nome: "Você", apelido: "VC", cor: "oklch(0.55 0.16 150)", pontos: 1720, variacao: 1, exatos: 6, quotas: 2, evolucao: [6, 5, 4, 3, 2], palpites_validos: 38, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "3", nome: "Rafael Tomaz", apelido: "RT", cor: "oklch(0.6 0.18 30)", pontos: 1655, variacao: -2, exatos: 5, quotas: 2, evolucao: [1, 2, 2, 3, 3], palpites_validos: 36, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "4", nome: "Juliana Prado", apelido: "JP", cor: "oklch(0.6 0.18 280)", pontos: 1540, variacao: 0, exatos: 5, quotas: 1, evolucao: [4, 4, 4, 4, 4], palpites_validos: 35, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "5", nome: "Diego Alves", apelido: "DA", cor: "oklch(0.65 0.16 200)", pontos: 1490, variacao: 3, exatos: 4, quotas: 4, evolucao: [8, 7, 6, 6, 5], palpites_validos: 33, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "6", nome: "Marina Souza", apelido: "MS", cor: "oklch(0.6 0.17 350)", pontos: 1410, variacao: -1, exatos: 4, quotas: 2, evolucao: [5, 5, 6, 5, 6], palpites_validos: 28, palpites_possiveis: 40, elegivel_lanterna: false },
  { id: "7", nome: "Marcos (ET)", apelido: "ET", cor: "oklch(0.55 0.13 260)", pontos: 1320, variacao: 1, exatos: 3, quotas: 1, evolucao: [8, 8, 7, 7, 7], palpites_validos: 34, palpites_possiveis: 40, elegivel_lanterna: true },
  { id: "8", nome: "Aninha Lima", apelido: "AL", cor: "oklch(0.7 0.16 60)", pontos: 1180, variacao: -3, exatos: 2, quotas: 2, evolucao: [5, 5, 6, 7, 8], palpites_validos: 22, palpites_possiveis: 40, elegivel_lanterna: false },
];

// ----- Usuário atual e papel -----
export type CurrentUser = {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  role: "admin" | "participante";
  notificacoes: { whatsapp: boolean; email: boolean; antesDeTravar: boolean };
};

// Troque role para "admin" para testar funcionalidades administrativas.
export const currentUser: CurrentUser = {
  id: "2",
  nome: "Você",
  apelido: "VC",
  email: "voce@perebas.com",
  role: "admin",
  notificacoes: { whatsapp: true, email: true, antesDeTravar: true },
};

// ----- Prêmio -----
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
  atualizado_em: string; // ISO
  evolucao: { data: string; valor: number }[];
  distribuicao: DistribuicaoItem[];
  ultimasConfirmacoes: { quota: string; valor: number; ha: string }[];
};

export const distribuicaoDefault: DistribuicaoItem[] = [
  { id: "primeiro", label: "1º lugar", pct: 60 },
  { id: "segundo", label: "2º lugar", pct: 25 },
  { id: "terceiro", label: "3º lugar", pct: 10 },
  { id: "lanterna", label: "Lanterninha", pct: 5 },
];

export const premio: Premio = {
  total_confirmado: 2350,
  total_pendente: 450,
  meta: 5000,
  quotas_pagas: 47,
  quotas_pendentes: 9,
  atualizado_em: new Date().toISOString(),
  evolucao: [
    { data: "01/05", valor: 200 },
    { data: "05/05", valor: 450 },
    { data: "10/05", valor: 720 },
    { data: "15/05", valor: 980 },
    { data: "20/05", valor: 1240 },
    { data: "25/05", valor: 1500 },
    { data: "30/05", valor: 1750 },
    { data: "03/06", valor: 1950 },
    { data: "06/06", valor: 2100 },
    { data: "08/06", valor: 2200 },
    { data: "10/06", valor: 2350 },
  ],
  distribuicao: distribuicaoDefault,
  ultimasConfirmacoes: [
    { quota: "Carlinha #2", valor: 50, ha: "12 min" },
    { quota: "Diego #4", valor: 50, ha: "47 min" },
    { quota: "ET #1", valor: 50, ha: "1h 20min" },
    { quota: "Rafa #2", valor: 50, ha: "2h" },
    { quota: "Juliana #1", valor: 50, ha: "3h 15min" },
    { quota: "Marina #2", valor: 50, ha: "5h" },
    { quota: "Você #2", valor: 50, ha: "ontem" },
    { quota: "Aninha #1", valor: 50, ha: "ontem" },
    { quota: "Carlinha #3", valor: 50, ha: "2 dias" },
    { quota: "Pedro #1", valor: 50, ha: "2 dias" },
  ],
};

// ----- Perfis de personalidade -----
export type PerfilPersonalidade = {
  participante_id: string;
  apelido_principal: string;
  apelidos_alternativos: string[];
  tracos: { traco: string; brincadeira: string }[];
  tags: string[];
  observacoes_admin: string;
};

export const perfis: PerfilPersonalidade[] = [
  {
    participante_id: "1",
    apelido_principal: "Carlinha",
    apelidos_alternativos: ["Cacá", "Carlou"],
    tracos: [
      { traco: "sempre chega atrasada", brincadeira: "perdeu o palpite de novo, claro" },
      { traco: "compra quota última hora", brincadeira: "vivendo no fio do prazo" },
    ],
    tags: ["atrasada", "última hora"],
    observacoes_admin: "Adora cravar placar exato no último minuto antes de travar.",
  },
  {
    participante_id: "7",
    apelido_principal: "ET",
    apelidos_alternativos: ["Limão", "Marcão"],
    tracos: [
      { traco: "mal humorado", brincadeira: "na sua melhor versão limão" },
      { traco: "reclama de tudo", brincadeira: "já achou alguém pra culpar pelo palpite errado" },
    ],
    tags: ["limão", "rabugento"],
    observacoes_admin: "Sempre acha que o app travou — nunca travou.",
  },
  {
    participante_id: "3",
    apelido_principal: "Rafa",
    apelidos_alternativos: ["Rafão", "Tático"],
    tracos: [
      { traco: "acha que entende muito de tática", brincadeira: "explicando 4-3-3 pra quem não pediu" },
    ],
    tags: ["tático", "narrador"],
    observacoes_admin: "Comenta cada palpite como se fosse Galvão Bueno.",
  },
  {
    participante_id: "4",
    apelido_principal: "Juliana",
    apelidos_alternativos: ["Ju", "Empate-Sempre"],
    tracos: [
      { traco: "defensora oficial do empate", brincadeira: "se for 0x0, ela ganhou" },
    ],
    tags: ["empate", "conservadora"],
    observacoes_admin: "Já palpitou empate em 60% dos jogos.",
  },
  {
    participante_id: "5",
    apelido_principal: "Diego",
    apelidos_alternativos: ["Dieguito", "Zebra"],
    tracos: [
      { traco: "aposta sempre na zebra", brincadeira: "comprou a quarta quota só pra dar Canadá campeão" },
    ],
    tags: ["zebra", "esperançoso"],
    observacoes_admin: "Compra quotas como quem compra raspadinha.",
  },
  {
    participante_id: "6",
    apelido_principal: "Marina",
    apelidos_alternativos: ["Mari"],
    tracos: [
      { traco: "esquece de palpitar e culpa o WhatsApp", brincadeira: "'mas o grupo não notificou!'" },
    ],
    tags: ["WhatsApp", "esquecida"],
    observacoes_admin: "Notificação chega, ela só não abre.",
  },
];

// ----- Boletins -----
export type Boletim = {
  id: string;
  data: string; // dd/mm/aaaa
  titulo: string;
  conteudo: string;
  conteudo_original?: string; // antes da edição do admin
  status: "publicado" | "rascunho" | "agendado";
  publicado_em?: string;
  agendado_para?: string;
};

export const boletins: Boletim[] = [
  {
    id: "b3",
    data: "13/06/2026",
    titulo: "Carlinha disparou e ET azedou",
    conteudo:
      "A Carlinha (sim, a Cacá) quase perdeu o palpite outra vez, mas dessa vez cravou o placar de Brasil x Portugal e disparou pra liderança. O ET (o Limão, claro) acertou só meia-hora antes de fechar e ainda assim tá em sétimo — vai ver hoje o limão azedou pro lado errado. Diego segue investindo: agora são 4 quotas só pra apostar em zebra.",
    status: "publicado",
    publicado_em: "13/06/2026 22:10",
  },
  {
    id: "b2",
    data: "12/06/2026",
    titulo: "EUA x Uruguai e o palpite estranho",
    conteudo:
      "EUA empatou com o Uruguai e quase ninguém da perebada acertou. A Juliana, claro, palpitou empate e levou os pontos. O Rafa veio explicar tática no grupo às 3 da manhã — ninguém pediu.",
    status: "publicado",
    publicado_em: "12/06/2026 23:45",
  },
  {
    id: "b1",
    data: "11/06/2026",
    titulo: "Abertura: México 2x1 Canadá",
    conteudo:
      "Começou a Copa e a perebada já tá animada. México fez 2x1 no Canadá e metade do bolão cravou. A Marina, por algum motivo cósmico, esqueceu de palpitar — culpou o WhatsApp.",
    status: "publicado",
    publicado_em: "11/06/2026 23:30",
  },
];

// Boletim do dia (rascunho/preview no dashboard)
export const boletimDoDia: Boletim = {
  id: "b4",
  data: new Date().toLocaleDateString("pt-BR"),
  titulo: "Boletim de hoje",
  conteudo:
    "A Carlinha (sim, a Cacá) disparou na liderança após cravar o placar de Brasil x Portugal — quase esqueceu de palpitar, como sempre, mas dessa vez deu sorte. O Rafão caiu duas posições e já apareceu no grupo explicando tática que ninguém pediu. O Diego segue investindo em quotas — agora são 4! E o ET tá lá no sétimo, na sua melhor versão limão.",
  status: "rascunho",
};

// ----- Quotas do usuário -----
export type Quota = {
  id: string;
  numero: number;
  status: "ativa" | "aguardando_aprovacao" | "expirada";
  pagaEm?: string;
  pontos: number;
  posicao: number;
};

export const minhasQuotas: Quota[] = [
  { id: "q1", numero: 1, status: "ativa", pagaEm: "01/05/2026", pontos: 1720, posicao: 2 },
  { id: "q2", numero: 2, status: "ativa", pagaEm: "10/05/2026", pontos: 980, posicao: 14 },
];

// ----- Top 4 colocados (palpite) -----
export const janelasTop4 = [
  { fase: "Antes da Copa", eficacia: 100, ativa: false },
  { fase: "Fase de grupos", eficacia: 60, ativa: true },
  { fase: "Oitavas", eficacia: 30, ativa: false },
  { fase: "Quartas em diante", eficacia: 10, ativa: false },
];

// ====================== ADMIN AREA ======================

export type PagamentoAdmin = {
  id: string;
  participante: string;
  quota_label: string;
  valor: number;
  data: string;
  status: "pendente" | "aprovado" | "rejeitado" | "estornado";
  comprovante_url?: string;
  motivo_rejeicao?: string;
  aprovado_por?: string;
  aprovado_em?: string;
};

export const pagamentosAdmin: PagamentoAdmin[] = [
  { id: "p01", participante: "Carlinha", quota_label: "Carlinha #2", valor: 50, data: "13/06/2026 14:32", status: "aprovado", aprovado_por: "Você", aprovado_em: "13/06/2026 14:40" },
  { id: "p02", participante: "Diego", quota_label: "Diego #4", valor: 50, data: "13/06/2026 13:55", status: "aprovado", aprovado_por: "Você", aprovado_em: "13/06/2026 14:02" },
  { id: "p03", participante: "ET", quota_label: "ET #1", valor: 50, data: "13/06/2026 13:00", status: "aprovado", aprovado_por: "Rafa", aprovado_em: "13/06/2026 13:15" },
  { id: "p04", participante: "Rafa", quota_label: "Rafa #2", valor: 50, data: "13/06/2026 12:10", status: "aprovado" },
  { id: "p05", participante: "Juliana", quota_label: "Juliana #1", valor: 50, data: "13/06/2026 11:00", status: "aprovado" },
  { id: "p06", participante: "Marina", quota_label: "Marina #2", valor: 50, data: "13/06/2026 09:45", status: "pendente", comprovante_url: "/mock-comprovante.png" },
  { id: "p07", participante: "Aninha", quota_label: "Aninha #2", valor: 50, data: "12/06/2026 22:30", status: "pendente", comprovante_url: "/mock-comprovante.png" },
  { id: "p08", participante: "Pedro", quota_label: "Pedro #1", valor: 50, data: "11/06/2026 18:20", status: "pendente", comprovante_url: "/mock-comprovante.png" },
  { id: "p09", participante: "Diego", quota_label: "Diego #5", valor: 50, data: "10/06/2026 10:00", status: "rejeitado", motivo_rejeicao: "Comprovante ilegível" },
  { id: "p10", participante: "Carlinha", quota_label: "Carlinha #3", valor: 50, data: "08/06/2026 19:11", status: "aprovado" },
  { id: "p11", participante: "ET", quota_label: "ET #2", valor: 50, data: "07/06/2026 14:00", status: "estornado", motivo_rejeicao: "Solicitou cancelamento" },
  { id: "p12", participante: "Rafa", quota_label: "Rafa #1", valor: 50, data: "05/06/2026 09:00", status: "aprovado" },
  { id: "p13", participante: "Você", quota_label: "Você #2", valor: 50, data: "04/06/2026 16:30", status: "aprovado" },
  { id: "p14", participante: "Marina", quota_label: "Marina #1", valor: 50, data: "03/06/2026 11:00", status: "aprovado" },
  { id: "p15", participante: "Juliana", quota_label: "Juliana #2", valor: 50, data: "02/06/2026 20:15", status: "pendente", comprovante_url: "/mock-comprovante.png" },
  { id: "p16", participante: "Diego", quota_label: "Diego #3", valor: 50, data: "01/06/2026 10:00", status: "aprovado" },
  { id: "p17", participante: "Aninha", quota_label: "Aninha #1", valor: 50, data: "30/05/2026 13:00", status: "aprovado" },
  { id: "p18", participante: "Pedro", quota_label: "Pedro #2", valor: 50, data: "29/05/2026 15:30", status: "rejeitado", motivo_rejeicao: "Valor divergente" },
];

export type Convite = {
  id: string;
  email: string;
  nome: string;
  status: "pendente" | "usado" | "expirado" | "revogado";
  enviado_em: string;
  expira_em: string;
};

export const convites: Convite[] = [
  { id: "c1", email: "tio@perebas.com", nome: "Tio do Pavê", status: "pendente", enviado_em: "10/06/2026", expira_em: "17/06/2026" },
  { id: "c2", email: "fernanda@perebas.com", nome: "Fernanda", status: "usado", enviado_em: "01/05/2026", expira_em: "08/05/2026" },
  { id: "c3", email: "lucas@perebas.com", nome: "Lucas", status: "usado", enviado_em: "01/05/2026", expira_em: "08/05/2026" },
  { id: "c4", email: "primo@perebas.com", nome: "Primo do Rafa", status: "expirado", enviado_em: "20/04/2026", expira_em: "27/04/2026" },
  { id: "c5", email: "vizinha@perebas.com", nome: "Vizinha", status: "pendente", enviado_em: "11/06/2026", expira_em: "18/06/2026" },
  { id: "c6", email: "cunhado@perebas.com", nome: "Cunhado da Marina", status: "revogado", enviado_em: "15/05/2026", expira_em: "22/05/2026" },
  { id: "c7", email: "chefe@perebas.com", nome: "Chefe do ET", status: "pendente", enviado_em: "12/06/2026", expira_em: "19/06/2026" },
  { id: "c8", email: "amigo@perebas.com", nome: "Amigão", status: "usado", enviado_em: "02/05/2026", expira_em: "09/05/2026" },
];

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "participante";
  quotas_count: number;
  ultimo_acesso?: string;
  ativo: boolean;
};

export const usuariosAdmin: UsuarioAdmin[] = [
  { id: "u1", nome: "Carla Mendes", email: "carla@perebas.com", role: "participante", quotas_count: 3, ultimo_acesso: "há 12min", ativo: true },
  { id: "u2", nome: "Você", email: "voce@perebas.com", role: "admin", quotas_count: 2, ultimo_acesso: "agora", ativo: true },
  { id: "u3", nome: "Rafael Tomaz", email: "rafa@perebas.com", role: "admin", quotas_count: 2, ultimo_acesso: "há 1h", ativo: true },
  { id: "u4", nome: "Juliana Prado", email: "juliana@perebas.com", role: "participante", quotas_count: 1, ultimo_acesso: "há 3h", ativo: true },
  { id: "u5", nome: "Diego Alves", email: "diego@perebas.com", role: "participante", quotas_count: 4, ultimo_acesso: "há 5h", ativo: true },
  { id: "u6", nome: "Marina Souza", email: "marina@perebas.com", role: "participante", quotas_count: 2, ultimo_acesso: "ontem", ativo: true },
  { id: "u7", nome: "Marcos (ET)", email: "et@perebas.com", role: "admin", quotas_count: 1, ultimo_acesso: "há 2h", ativo: true },
  { id: "u8", nome: "Aninha Lima", email: "aninha@perebas.com", role: "participante", quotas_count: 2, ultimo_acesso: "há 6h", ativo: true },
  { id: "u9", nome: "Fernanda", email: "fernanda@perebas.com", role: "participante", quotas_count: 1, ultimo_acesso: "há 2 dias", ativo: true },
  { id: "u10", nome: "Lucas", email: "lucas@perebas.com", role: "participante", quotas_count: 1, ativo: false },
  { id: "u11", nome: "Amigão", email: "amigo@perebas.com", role: "participante", quotas_count: 1, ultimo_acesso: "há 3 dias", ativo: true },
];

export type AuditoriaItem = {
  id: string;
  ator: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  payload?: Record<string, unknown>;
  data: string;
};

export const auditoria: AuditoriaItem[] = [
  { id: "a1", ator: "Você", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p01", payload: { valor: 50 }, data: "13/06/2026 14:40" },
  { id: "a2", ator: "Você", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p02", payload: { valor: 50 }, data: "13/06/2026 14:02" },
  { id: "a3", ator: "Rafa", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p03", data: "13/06/2026 13:15" },
  { id: "a4", ator: "Você", acao: "publicou_boletim", entidade: "boletim", entidade_id: "b3", data: "13/06/2026 22:10" },
  { id: "a5", ator: "ET", acao: "rejeitou_pagamento", entidade: "pagamento", entidade_id: "p09", payload: { motivo: "Comprovante ilegível" }, data: "10/06/2026 10:30" },
  { id: "a6", ator: "Você", acao: "atualizou_perfil", entidade: "perfil", entidade_id: "1", data: "12/06/2026 18:00" },
  { id: "a7", ator: "Rafa", acao: "convidou_usuario", entidade: "convite", entidade_id: "c1", payload: { email: "tio@perebas.com" }, data: "10/06/2026 09:00" },
  { id: "a8", ator: "Você", acao: "publicou_boletim", entidade: "boletim", entidade_id: "b2", data: "12/06/2026 23:45" },
  { id: "a9", ator: "Você", acao: "estornou_pagamento", entidade: "pagamento", entidade_id: "p11", payload: { motivo: "Solicitou cancelamento" }, data: "08/06/2026 12:00" },
  { id: "a10", ator: "ET", acao: "atualizou_premiacao", entidade: "premiacao", entidade_id: "default", payload: { meta: 5000 }, data: "20/04/2026 10:00" },
  { id: "a11", ator: "Você", acao: "importou_jogos", entidade: "jogos", entidade_id: "csv-001", payload: { count: 48 }, data: "15/04/2026 09:00" },
  { id: "a12", ator: "Rafa", acao: "convidou_usuario", entidade: "convite", entidade_id: "c5", data: "11/06/2026 14:30" },
  { id: "a13", ator: "Você", acao: "revogou_convite", entidade: "convite", entidade_id: "c6", data: "20/05/2026 10:00" },
  { id: "a14", ator: "Você", acao: "publicou_boletim", entidade: "boletim", entidade_id: "b1", data: "11/06/2026 23:30" },
  { id: "a15", ator: "ET", acao: "atualizou_perfil", entidade: "perfil", entidade_id: "5", data: "11/06/2026 19:00" },
  { id: "a16", ator: "Rafa", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p10", data: "08/06/2026 19:30" },
  { id: "a17", ator: "Você", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p13", data: "04/06/2026 16:45" },
  { id: "a18", ator: "Você", acao: "criou_perfil", entidade: "perfil", entidade_id: "6", data: "01/06/2026 14:00" },
  { id: "a19", ator: "ET", acao: "atualizou_configuracoes", entidade: "config", entidade_id: "pix", data: "30/05/2026 11:00" },
  { id: "a20", ator: "Você", acao: "rejeitou_pagamento", entidade: "pagamento", entidade_id: "p18", payload: { motivo: "Valor divergente" }, data: "29/05/2026 16:00" },
  { id: "a21", ator: "Rafa", acao: "atualizou_jogo", entidade: "jogo", entidade_id: "3", data: "13/06/2026 21:50" },
  { id: "a22", ator: "Você", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p17", data: "30/05/2026 13:30" },
  { id: "a23", ator: "Você", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p14", data: "03/06/2026 11:30" },
  { id: "a24", ator: "ET", acao: "aprovou_pagamento", entidade: "pagamento", entidade_id: "p16", data: "01/06/2026 10:30" },
  { id: "a25", ator: "Você", acao: "atualizou_premiacao", entidade: "premiacao", entidade_id: "default", payload: { meta: 5000 }, data: "10/06/2026 09:00" },
];

export type PremiacaoConfig = {
  meta: number;
  custos_operacionais: number;
  distribuicao: DistribuicaoItem[];
};

export const premiacaoConfig: PremiacaoConfig = {
  meta: 5000,
  custos_operacionais: 200,
  distribuicao: distribuicaoDefault,
};

// ----- Reportes de bug -----
export type Reporte = {
  id: string;
  descricao: string;
  url: string;
  user_agent: string;
  autor: string;
  data: string;
  severidade: "critico" | "importante" | "menor";
  status: "aberto" | "em_analise" | "resolvido";
};

export const reportes: Reporte[] = [
  { id: "r1", descricao: "Card do prêmio sumiu no mobile", url: "/app", user_agent: "Mobile Safari", autor: "Carlinha", data: "13/06/2026 10:00", severidade: "importante", status: "aberto" },
  { id: "r2", descricao: "Toast some rápido demais", url: "/app/palpites", user_agent: "Chrome", autor: "ET", data: "12/06/2026 22:00", severidade: "menor", status: "em_analise" },
  { id: "r3", descricao: "Pontos não atualizaram após o jogo", url: "/app/ranking", user_agent: "Chrome", autor: "Rafa", data: "11/06/2026 09:00", severidade: "critico", status: "resolvido" },
];

// jogos extras pra gestão admin (mockados rápido)
export const jogosAdminExtra: Jogo[] = Array.from({ length: 45 }).map((_, i) => {
  const fases = ["Fase de grupos", "Fase de grupos", "Fase de grupos", "Oitavas", "Quartas", "Semifinal", "Final"];
  const sigs = Object.keys(times);
  const casa = sigs[i % sigs.length];
  const fora = sigs[(i + 3) % sigs.length];
  return {
    id: `g${i + 100}`,
    fase: fases[Math.min(Math.floor(i / 8), fases.length - 1)],
    data: `${(11 + (i % 20)).toString().padStart(2, "0")}/06`,
    hora: `${13 + (i % 8)}:00`,
    estadio: "Stadium",
    cidade: ["Los Angeles", "NYC", "Toronto", "México DF", "Miami"][i % 5],
    casa,
    fora,
    peso: 10 + (i % 15),
    status: i < 8 ? "encerrado" : "agendado",
    placarCasa: i < 8 ? Math.floor(Math.random() * 4) : undefined,
    placarFora: i < 8 ? Math.floor(Math.random() * 4) : undefined,
  } as Jogo;
});

// Janelas top 4 com correção (rodada C)
export const janelasTop4Corrigida = [
  { fase: "Antes da Copa", eficacia: 100, ativa: false },
  { fase: "Fase de grupos", eficacia: 50, ativa: true },
  { fase: "Oitavas", eficacia: 25, ativa: false },
  { fase: "Quartas", eficacia: 12.5, ativa: false },
  { fase: "Semis", eficacia: 6.25, ativa: false },
  { fase: "Final", eficacia: 0, ativa: false },
];

export function gerarBoletimMock(
  rankingDoDia: Participante[] = ranking,
  perfisAtivos: PerfilPersonalidade[] = perfis,
): { titulo: string; conteudo: string } {
  const sorted = [...rankingDoDia];
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
