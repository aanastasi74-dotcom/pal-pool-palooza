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
};

export const ranking: Participante[] = [
  { id: "1", nome: "Carla Mendes", apelido: "CM", cor: "oklch(0.7 0.17 90)", pontos: 1840, variacao: 2, exatos: 7, quotas: 3, evolucao: [5, 4, 4, 3, 1] },
  { id: "2", nome: "Você", apelido: "VC", cor: "oklch(0.55 0.16 150)", pontos: 1720, variacao: 1, exatos: 6, quotas: 2, evolucao: [6, 5, 4, 3, 2] },
  { id: "3", nome: "Rafael Tomaz", apelido: "RT", cor: "oklch(0.6 0.18 30)", pontos: 1655, variacao: -2, exatos: 5, quotas: 2, evolucao: [1, 2, 2, 3, 3] },
  { id: "4", nome: "Juliana Prado", apelido: "JP", cor: "oklch(0.6 0.18 280)", pontos: 1540, variacao: 0, exatos: 5, quotas: 1, evolucao: [4, 4, 4, 4, 4] },
  { id: "5", nome: "Diego Alves", apelido: "DA", cor: "oklch(0.65 0.16 200)", pontos: 1490, variacao: 3, exatos: 4, quotas: 4, evolucao: [8, 7, 6, 6, 5] },
  { id: "6", nome: "Marina Souza", apelido: "MS", cor: "oklch(0.6 0.17 350)", pontos: 1410, variacao: -1, exatos: 4, quotas: 2, evolucao: [5, 5, 6, 5, 6] },
  { id: "7", nome: "Marcos (ET)", apelido: "ET", cor: "oklch(0.55 0.13 260)", pontos: 1320, variacao: 1, exatos: 3, quotas: 1, evolucao: [8, 8, 7, 7, 7] },
  { id: "8", nome: "Aninha Lima", apelido: "AL", cor: "oklch(0.7 0.16 60)", pontos: 1180, variacao: -3, exatos: 2, quotas: 2, evolucao: [5, 5, 6, 7, 8] },
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
export type Premio = {
  total_confirmado: number;
  total_pendente: number;
  meta: number;
  quotas_pagas: number;
  quotas_pendentes: number;
  atualizado_em: string; // ISO
  evolucao: { data: string; valor: number }[];
  distribuicao: { posicao: number; pct: number }[];
  ultimasConfirmacoes: { quota: string; valor: number; ha: string }[];
};

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
  distribuicao: [
    { posicao: 1, pct: 50 },
    { posicao: 2, pct: 25 },
    { posicao: 3, pct: 15 },
    { posicao: 4, pct: 10 },
  ],
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
      { traco: "ET Carlou", brincadeira: "esqueceu de preencher de novo" },
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
  status: "publicado" | "rascunho";
  publicado_em?: string;
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
