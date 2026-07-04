import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { vencedorDoJogo } from "@/lib/top4-potencial/engine";
import type { Team } from "@/lib/queries/teams";

type MatchLike = {
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
  home_origem?: string | null;
  away_origem?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  apelido: string;
  numero: number;
  picks: { campeao: string; vice: string; terceiro: string; quarto: string };
  teams: Team[];
  matches: MatchLike[];
  potencial: number;
  peso: number;
};

const SLOT_LABEL: Record<"campeao" | "vice" | "terceiro" | "quarto", string> = {
  campeao: "Campeão",
  vice: "Vice",
  terceiro: "3º lugar",
  quarto: "4º lugar",
};

function statusDoTime(teamId: string | undefined, matches: MatchLike[]): { label: string; cls: string } {
  if (!teamId) return { label: "—", cls: "text-muted-foreground" };

  const final = matches.find((m) => m.numero_jogo === 104);
  const terceiroJogo = matches.find((m) => m.numero_jogo === 103);
  const vencFinal = final ? vencedorDoJogo(final as any) : null;
  if (final?.status === "encerrado" && vencFinal) {
    const perdedorFinal =
      final.team_home_id === vencFinal ? final.team_away_id : final.team_home_id;
    if (vencFinal === teamId) return { label: "🏆 Campeão", cls: "text-success" };
    if (perdedorFinal === teamId) return { label: "🥈 Vice", cls: "text-success" };
  }
  const venc3 = terceiroJogo ? vencedorDoJogo(terceiroJogo as any) : null;
  if (terceiroJogo?.status === "encerrado" && venc3) {
    const perdedor3 =
      terceiroJogo.team_home_id === venc3 ? terceiroJogo.team_away_id : terceiroJogo.team_home_id;
    if (venc3 === teamId) return { label: "🥉 3º lugar", cls: "text-success" };
    if (perdedor3 === teamId) return { label: "4º lugar", cls: "text-muted-foreground" };
  }

  // Último jogo encerrado em que o time perdeu
  const eliminado = matches
    .filter((m) => {
      if (m.numero_jogo == null || m.numero_jogo < 73) return false;
      if (m.status !== "encerrado") return false;
      if (m.team_home_id !== teamId && m.team_away_id !== teamId) return false;
      const v = vencedorDoJogo(m as any);
      return !!v && v !== teamId;
    })
    .sort((a, b) => (b.numero_jogo ?? 0) - (a.numero_jogo ?? 0))[0];

  if (eliminado) {
    const n = eliminado.numero_jogo!;
    let fase = "no mata-mata";
    if (n >= 73 && n <= 88) fase = "no R32";
    else if (n >= 89 && n <= 96) fase = "nas Oitavas";
    else if (n >= 97 && n <= 100) fase = "nas Quartas";
    else if (n >= 101 && n <= 102) fase = "nas Semis";
    return { label: `Eliminado ${fase}`, cls: "text-destructive" };
  }

  return { label: "Ainda na disputa", cls: "text-primary" };
}

export function Top4QuotaDetalheDialog({
  open,
  onOpenChange,
  apelido,
  numero,
  picks,
  teams,
  matches,
  potencial,
  peso,
}: Props) {
  const teamByBp = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.bracket_position, t);
    return map;
  }, [teams]);

  const linhas = (["campeao", "vice", "terceiro", "quarto"] as const).map((slot) => {
    const bp = picks[slot];
    const team = teamByBp.get(bp);
    const st = statusDoTime(team?.id, matches);
    return { slot, team, st };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Top 4 de {apelido} <span className="text-muted-foreground">· Quota #{numero}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {linhas.map(({ slot, team, st }) => (
            <div
              key={slot}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-16">
                  {SLOT_LABEL[slot]}
                </span>
                <span className="text-xl">{team?.bandeira_emoji ?? "🏳️"}</span>
                <span className="truncate font-display font-bold">{team?.nome_pt ?? "—"}</span>
              </div>
              <span className={`shrink-0 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Potencial atual: <strong>{potencial.toLocaleString("pt-BR")} pts</strong> · Eficácia {peso}%
          </p>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
