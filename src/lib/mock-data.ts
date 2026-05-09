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
};

export const jogos: Jogo[] = [
  { id: "1", fase: "Grupo A", data: "11/06", hora: "21:00", estadio: "Estádio Azteca", cidade: "Cidade do México",
    casa: "MEX", fora: "CAN", peso: 10, status: "encerrado", placarCasa: 2, placarFora: 1, meuPalpiteCasa: 2, meuPalpiteFora: 1 },
  { id: "2", fase: "Grupo B", data: "12/06", hora: "16:00", estadio: "MetLife Stadium", cidade: "Nova York",
    casa: "EUA", fora: "URU", peso: 11, status: "encerrado", placarCasa: 1, placarFora: 1, meuPalpiteCasa: 2, meuPalpiteFora: 0 },
  { id: "3", fase: "Grupo C", data: "13/06", hora: "20:00", estadio: "SoFi Stadium", cidade: "Los Angeles",
    casa: "BRA", fora: "POR", peso: 12, status: "ao-vivo", placarCasa: 2, placarFora: 0, meuPalpiteCasa: 3, meuPalpiteFora: 1 },
  { id: "4", fase: "Grupo D", data: "14/06", hora: "13:00", estadio: "Mercedes-Benz Stadium", cidade: "Atlanta",
    casa: "ARG", fora: "HOL", peso: 13, status: "agendado", meuPalpiteCasa: 2, meuPalpiteFora: 1 },
  { id: "5", fase: "Grupo E", data: "14/06", hora: "16:00", estadio: "AT&T Stadium", cidade: "Dallas",
    casa: "FRA", fora: "ALE", peso: 13, status: "agendado" },
  { id: "6", fase: "Grupo F", data: "15/06", hora: "19:00", estadio: "BMO Field", cidade: "Toronto",
    casa: "ESP", fora: "ING", peso: 14, status: "agendado", meuPalpiteCasa: 1, meuPalpiteFora: 2 },
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
};

export const ranking: Participante[] = [
  { id: "1", nome: "Carla Mendes", apelido: "CM", cor: "oklch(0.7 0.17 90)", pontos: 1840, variacao: 2, exatos: 7, quotas: 3 },
  { id: "2", nome: "Você", apelido: "VC", cor: "oklch(0.55 0.16 150)", pontos: 1720, variacao: 1, exatos: 6, quotas: 2 },
  { id: "3", nome: "Rafael Tomaz", apelido: "RT", cor: "oklch(0.6 0.18 30)", pontos: 1655, variacao: -2, exatos: 5, quotas: 2 },
  { id: "4", nome: "Juliana Prado", apelido: "JP", cor: "oklch(0.6 0.18 280)", pontos: 1540, variacao: 0, exatos: 5, quotas: 1 },
  { id: "5", nome: "Diego Alves", apelido: "DA", cor: "oklch(0.65 0.16 200)", pontos: 1490, variacao: 3, exatos: 4, quotas: 4 },
  { id: "6", nome: "Marina Souza", apelido: "MS", cor: "oklch(0.6 0.17 350)", pontos: 1410, variacao: -1, exatos: 4, quotas: 2 },
  { id: "7", nome: "Pedro Henrique", apelido: "PH", cor: "oklch(0.55 0.13 260)", pontos: 1320, variacao: 1, exatos: 3, quotas: 1 },
  { id: "8", nome: "Aninha Lima", apelido: "AL", cor: "oklch(0.7 0.16 60)", pontos: 1180, variacao: -3, exatos: 2, quotas: 2 },
];
