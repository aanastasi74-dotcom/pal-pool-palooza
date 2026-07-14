import { vencedorDoJogo } from "@/lib/top4-potencial/engine";

export type MatchLike = {
  numero_jogo: number | null;
  team_home_id: string | null;
  team_away_id: string | null;
  status: string | null;
  placar_casa?: number | null;
  placar_fora?: number | null;
  placar_casa_prorrogacao?: number | null;
  placar_fora_prorrogacao?: number | null;
  penaltis_casa?: number | null;
  penaltis_fora?: number | null;
};

export type EstadoTime =
  | "campeao"
  | "vice"
  | "terceiro"
  | "quarto"
  | "disputa_titulo"
  | "disputa_terceiro"
  | "disputa_pendente"
  | "eliminado_grupos"
  | "eliminado_r32"
  | "eliminado_oitavas"
  | "eliminado_quartas";

export type PosicaoApostada = "campeao" | "vice" | "terceiro" | "quarto";

export const LABEL_ESTADO: Record<EstadoTime, string> = {
  campeao: "🏆 Campeão",
  vice: "🥈 Vice-campeão",
  terceiro: "🥉 3º lugar",
  quarto: "4º lugar",
  disputa_titulo: "Disputará o título",
  disputa_terceiro: "Disputará o 3º lugar",
  disputa_pendente: "Ainda na disputa",
  eliminado_grupos: "Eliminado na fase de grupos",
  eliminado_r32: "Eliminado no R32",
  eliminado_oitavas: "Eliminado nas Oitavas",
  eliminado_quartas: "Eliminado nas Quartas",
};

export function estadoDoTime(teamId: string | undefined, matches: MatchLike[]): EstadoTime | null {
  if (!teamId) return null;

  const final = matches.find((m) => m.numero_jogo === 104);
  if (final?.status === "encerrado") {
    const venc = vencedorDoJogo(final as any);
    if (venc) {
      const perdedor = final.team_home_id === venc ? final.team_away_id : final.team_home_id;
      if (venc === teamId) return "campeao";
      if (perdedor === teamId) return "vice";
    }
  }

  const jogo3 = matches.find((m) => m.numero_jogo === 103);
  if (jogo3?.status === "encerrado") {
    const venc = vencedorDoJogo(jogo3 as any);
    if (venc) {
      const perdedor = jogo3.team_home_id === venc ? jogo3.team_away_id : jogo3.team_home_id;
      if (venc === teamId) return "terceiro";
      if (perdedor === teamId) return "quarto";
    }
  }

  const semis = matches.filter((m) => m.numero_jogo === 101 || m.numero_jogo === 102);
  for (const semi of semis) {
    if (semi.team_home_id !== teamId && semi.team_away_id !== teamId) continue;
    if (semi.status === "encerrado") {
      const venc = vencedorDoJogo(semi as any);
      if (venc) {
        if (venc === teamId) return "disputa_titulo";
        return "disputa_terceiro";
      }
    } else {
      return "disputa_pendente";
    }
  }

  const eliminado = matches
    .filter((m) => {
      if (m.numero_jogo == null || m.numero_jogo < 73 || m.numero_jogo > 100) return false;
      if (m.status !== "encerrado") return false;
      if (m.team_home_id !== teamId && m.team_away_id !== teamId) return false;
      const v = vencedorDoJogo(m as any);
      return !!v && v !== teamId;
    })
    .sort((a, b) => (b.numero_jogo ?? 0) - (a.numero_jogo ?? 0))[0];

  if (eliminado) {
    const n = eliminado.numero_jogo!;
    if (n >= 73 && n <= 88) return "eliminado_r32";
    if (n >= 89 && n <= 96) return "eliminado_oitavas";
    if (n >= 97 && n <= 100) return "eliminado_quartas";
  }

  const apareceMataMata = matches.some(
    (m) =>
      m.numero_jogo != null &&
      m.numero_jogo >= 73 &&
      (m.team_home_id === teamId || m.team_away_id === teamId),
  );
  if (!apareceMataMata) return "eliminado_grupos";

  return null;
}

export function corDoEstado(estado: EstadoTime | null, posicaoApostada: PosicaoApostada): string {
  if (!estado) return "text-muted-foreground";

  if (estado === "campeao") return posicaoApostada === "campeao" ? "text-success" : "text-destructive";
  if (estado === "vice") return posicaoApostada === "vice" ? "text-success" : "text-destructive";
  if (estado === "terceiro") return posicaoApostada === "terceiro" ? "text-success" : "text-destructive";
  if (estado === "quarto") return posicaoApostada === "quarto" ? "text-success" : "text-destructive";

  if (estado === "disputa_titulo") {
    return posicaoApostada === "campeao" || posicaoApostada === "vice" ? "text-success" : "text-destructive";
  }
  if (estado === "disputa_terceiro") {
    return posicaoApostada === "terceiro" || posicaoApostada === "quarto" ? "text-success" : "text-destructive";
  }
  if (estado === "disputa_pendente") return "text-success";

  return "text-destructive";
}

export function estaEliminadoDaCopa(estado: EstadoTime | null): boolean {
  return (
    estado === "eliminado_grupos" ||
    estado === "eliminado_r32" ||
    estado === "eliminado_oitavas" ||
    estado === "eliminado_quartas"
  );
}
