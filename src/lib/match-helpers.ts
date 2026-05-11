import type { Team } from "@/lib/queries/teams";
import type { Stadium } from "@/lib/queries/stadiums";

export const FASE_LABELS: Record<string, string> = {
  grupos: "Fase de grupos",
  round_of_32: "Round of 32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semi: "Semifinal",
  terceiro_lugar: "Disputa de 3º",
  final: "Final",
};

export const faseLabel = (v?: string | null) =>
  (v && FASE_LABELS[v]) || v || "—";

export type MatchLike = {
  fase?: string | null;
  numero_jogo?: number | null;
  team_home_id?: string | null;
  team_away_id?: string | null;
  slot_casa?: string | null;
  slot_visitante?: string | null;
  stadium_id?: string | null;
  estadio?: string | null;
  cidade?: string | null;
  casa?: string | null;
  fora?: string | null;
};

export type TeamSide = {
  nome: string;
  bandeira: string;
  isSlot: boolean;
};

export function getTeamSide(
  teamId: string | null | undefined,
  slot: string | null | undefined,
  legacy: string | null | undefined,
  teamMap: Map<string, Team>,
): TeamSide {
  if (teamId) {
    const t = teamMap.get(teamId);
    if (t) return { nome: t.nome_pt, bandeira: t.bandeira_emoji, isSlot: false };
  }
  if (slot) return { nome: slot, bandeira: "🏳️", isSlot: true };
  return { nome: legacy ?? "?", bandeira: "🏳️", isSlot: true };
}

export function buildHeader(
  m: MatchLike,
  stadiumMap: Map<string, Stadium>,
): string {
  const parts: string[] = [];
  if (m.numero_jogo != null) parts.push(`Jogo ${m.numero_jogo}`);
  parts.push(faseLabel(m.fase));
  const st = m.stadium_id ? stadiumMap.get(m.stadium_id) : null;
  if (st) {
    parts.push(st.nome);
    parts.push(st.cidade);
  } else {
    if (m.estadio) parts.push(m.estadio);
    if (m.cidade) parts.push(m.cidade);
  }
  return parts.filter(Boolean).join(" · ");
}
