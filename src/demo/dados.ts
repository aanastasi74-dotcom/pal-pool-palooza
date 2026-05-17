// Dados estáticos do Modo Demo — NUNCA tocar no banco a partir de /demo
import { times } from "@/lib/mock-data";

export type DemoPereba = {
  id: string;
  apelido: string;
  nome: string;
  sigla: string;
  cor: string;
};

export type DemoJogo = {
  numero_jogo: number;
  fase: "grupos" | "oitavas" | "quartas" | "semis" | "final";
  data_jogo: string;
  estadio: string;
  cidade: string;
  casa: string; // sigla
  fora: string;
  peso: number;
  status: "agendado" | "encerrado";
  placar_casa?: number | null;
  placar_fora?: number | null;
  placar_casa_prorrogacao?: number | null;
  placar_fora_prorrogacao?: number | null;
  penaltis_casa?: number | null;
  penaltis_fora?: number | null;
};

export type DemoPalpite = {
  numero_jogo: number;
  palpite_casa: number;
  palpite_fora: number;
  pontos?: number | null; // null se jogo ainda não encerrou
};

export const PEREBA_VOCE_ID = "demo-voce";

export const PEREBAS_DEMO: DemoPereba[] = [
  { id: "demo-1", apelido: "CRACK", nome: "João Silva", sigla: "JOA", cor: "#ff6b6b" },
  { id: "demo-2", apelido: "TRETA", nome: "Maria Santos", sigla: "MAR", cor: "#4ecdc4" },
  { id: "demo-3", apelido: "ZICA", nome: "Pedro Oliveira", sigla: "PED", cor: "#ffe66d" },
  { id: "demo-4", apelido: "MITO", nome: "Ana Souza", sigla: "ANA", cor: "#a78bfa" },
  { id: PEREBA_VOCE_ID, apelido: "VOCÊ", nome: "Visitante", sigla: "VC", cor: "#3b82f6" },
  { id: "demo-5", apelido: "PIPOQUEIRO", nome: "Carlos Lima", sigla: "CAR", cor: "#f97316" },
  { id: "demo-6", apelido: "FERA", nome: "Juliana Costa", sigla: "JUL", cor: "#22c55e" },
  { id: "demo-7", apelido: "TROPEÇÃO", nome: "Rafael Mendes", sigla: "RAF", cor: "#eab308" },
  { id: "demo-8", apelido: "AZARÃO", nome: "Beatriz Rocha", sigla: "BEA", cor: "#ec4899" },
  { id: "demo-9", apelido: "PERNA-DE-PAU", nome: "Tiago Alves", sigla: "TIA", cor: "#64748b" },
  { id: "demo-10", apelido: "DESPERTOU", nome: "Camila Dias", sigla: "CAM", cor: "#06b6d4" },
  { id: "demo-11", apelido: "DORMINHOCO", nome: "Lucas Pereira", sigla: "LUC", cor: "#84cc16" },
];

export const JOGOS_DEMO: DemoJogo[] = [
  { numero_jogo: 1, fase: "grupos", data_jogo: "2026-06-11T17:00:00-03:00", estadio: "Estádio Azteca", cidade: "Cidade do México", casa: "MEX", fora: "POR", peso: 10, status: "encerrado", placar_casa: 2, placar_fora: 1 },
  { numero_jogo: 2, fase: "grupos", data_jogo: "2026-06-12T16:00:00-03:00", estadio: "SoFi Stadium", cidade: "Los Angeles", casa: "EUA", fora: "CAN", peso: 10, status: "encerrado", placar_casa: 1, placar_fora: 1 },
  { numero_jogo: 3, fase: "grupos", data_jogo: "2026-06-13T13:00:00-03:00", estadio: "Maracanã (RJ)", cidade: "Rio de Janeiro", casa: "BRA", fora: "URU", peso: 12, status: "encerrado", placar_casa: 3, placar_fora: 0 },
  { numero_jogo: 4, fase: "grupos", data_jogo: "2026-06-14T16:00:00-03:00", estadio: "Stade de France", cidade: "Paris", casa: "FRA", fora: "ALE", peso: 12, status: "encerrado", placar_casa: 2, placar_fora: 2 },
  { numero_jogo: 5, fase: "grupos", data_jogo: "2026-06-15T15:00:00-03:00", estadio: "Wembley", cidade: "Londres", casa: "ING", fora: "ESP", peso: 12, status: "encerrado", placar_casa: 0, placar_fora: 1 },
  { numero_jogo: 6, fase: "grupos", data_jogo: "2026-06-18T16:00:00-03:00", estadio: "Mercedes-Benz Stadium", cidade: "Atlanta", casa: "ARG", fora: "HOL", peso: 12, status: "agendado" },
  // mata-mata
  { numero_jogo: 7, fase: "oitavas", data_jogo: "2026-07-01T16:00:00-03:00", estadio: "MetLife Stadium", cidade: "Nova York", casa: "BRA", fora: "POR", peso: 25, status: "encerrado",
    placar_casa: 1, placar_fora: 1, placar_casa_prorrogacao: 1, placar_fora_prorrogacao: 0 }, // prorrogação
  { numero_jogo: 8, fase: "oitavas", data_jogo: "2026-07-02T17:00:00-03:00", estadio: "AT&T Stadium", cidade: "Dallas", casa: "ARG", fora: "FRA", peso: 25, status: "encerrado",
    placar_casa: 2, placar_fora: 2, placar_casa_prorrogacao: 0, placar_fora_prorrogacao: 0, penaltis_casa: 4, penaltis_fora: 3 }, // pênaltis
  { numero_jogo: 9, fase: "quartas", data_jogo: "2026-07-09T16:00:00-03:00", estadio: "Maracanã (RJ)", cidade: "Rio de Janeiro", casa: "BRA", fora: "ESP", peso: 35, status: "agendado" },
  { numero_jogo: 10, fase: "final", data_jogo: "2026-07-19T16:00:00-03:00", estadio: "MetLife Stadium", cidade: "Nova York", casa: "BRA", fora: "ARG", peso: 50, status: "agendado" },
];

export const PALPITES_DEMO_USUARIO: DemoPalpite[] = [
  { numero_jogo: 1, palpite_casa: 2, palpite_fora: 1, pontos: 120 }, // exato * 10
  { numero_jogo: 2, palpite_casa: 2, palpite_fora: 0, pontos: 0 },
  { numero_jogo: 3, palpite_casa: 3, palpite_fora: 1, pontos: 40 }, // resultado certo + gols vencedor
  { numero_jogo: 4, palpite_casa: 1, palpite_fora: 1, pontos: 48 }, // resultado certo * 12
  { numero_jogo: 5, palpite_casa: 1, palpite_fora: 2, pontos: 24 },
  { numero_jogo: 6, palpite_casa: 1, palpite_fora: 2, pontos: null },
  { numero_jogo: 7, palpite_casa: 1, palpite_fora: 0, pontos: 100 }, // tempo normal = 1×1, errou
  { numero_jogo: 8, palpite_casa: 2, palpite_fora: 1, pontos: 200 },
];

export const TOP4_DEMO = {
  posicao_1: "BRA",
  posicao_2: "ARG",
  posicao_3: "FRA",
  posicao_4: "ESP",
  peso_no_palpite: 100,
  alterado_em: "2026-05-10",
  fase_alteracao: "antes_copa" as const,
};

// Ranking (12 perebas) — pontos finais ordenados; "VOCÊ" no meio do bolão
export const RANKING_DEMO = [
  { pereba_id: "demo-3", pontos: 358, variacao: 1 },
  { pereba_id: "demo-1", pontos: 312, variacao: -1 },
  { pereba_id: "demo-6", pontos: 287, variacao: 2 },
  { pereba_id: "demo-2", pontos: 244, variacao: 0 },
  { pereba_id: "demo-4", pontos: 221, variacao: -2 },
  { pereba_id: "demo-5", pontos: 178, variacao: 0 },
  { pereba_id: PEREBA_VOCE_ID, pontos: 156, variacao: 3 },
  { pereba_id: "demo-10", pontos: 132, variacao: -1 },
  { pereba_id: "demo-8", pontos: 104, variacao: 0 },
  { pereba_id: "demo-7", pontos: 72, variacao: -2 },
  { pereba_id: "demo-9", pontos: 38, variacao: 0 },
  { pereba_id: "demo-11", pontos: 12, variacao: 0 },
];

export const PREMIO_DEMO = {
  total_confirmado: 12_500,
  meta: 15_000,
  quotas_pagas: 25,
};

export function getPereba(id: string) {
  return PEREBAS_DEMO.find((p) => p.id === id);
}

export function getTime(sigla: string) {
  return times[sigla] ?? { nome: sigla, sigla, bandeira: "🏳️" };
}
