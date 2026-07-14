import { useMemo, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { estadoDoTime, corDoEstado, LABEL_ESTADO, type PosicaoApostada } from "@/lib/top4-status";
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

type ContentProps = {
  apelido: string;
  numero: number;
  picks: { campeao: string; vice: string; terceiro: string; quarto: string };
  teams: Team[];
  matches: MatchLike[];
  potencial: number;
  peso: number;
  pontosCalculados?: number;
};

type Props = ContentProps & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const SLOT_LABEL: Record<"campeao" | "vice" | "terceiro" | "quarto", string> = {
  campeao: "Campeão",
  vice: "Vice",
  terceiro: "3º lugar",
  quarto: "4º lugar",
};


export function Top4QuotaContent({
  apelido,
  numero,
  picks,
  teams,
  matches,
  potencial,
  peso,
  pontosCalculados,
  headerRight,
  hideHeader = false,
}: ContentProps & { headerRight?: ReactNode; hideHeader?: boolean }) {
  const teamByBp = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.bracket_position, t);
    return map;
  }, [teams]);

  const linhas = (["campeao", "vice", "terceiro", "quarto"] as const).map((slot) => {
    const bp = picks[slot];
    const team = teamByBp.get(bp);
    const estado = estadoDoTime(team?.id, matches);
    const label = estado ? LABEL_ESTADO[estado] : "—";
    const cls = corDoEstado(estado, slot as PosicaoApostada);
    return { slot, team, label, cls };
  });

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="font-display font-bold">
            Top 4 de {apelido} <span className="text-muted-foreground font-normal">· Quota #{numero}</span>
          </div>
          {headerRight}
        </div>
      )}
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
      <p className="text-xs text-muted-foreground">
        {pontosCalculados !== undefined ? (
          <>
            Pontuação atual: <strong className="text-success">{pontosCalculados.toLocaleString("pt-BR")} pts</strong>
            {" · Potencial máx.: "}
            <strong>{potencial.toLocaleString("pt-BR")} pts</strong>
            {" · Eficácia "}{peso}%
          </>
        ) : (
          <>
            Potencial atual: <strong>{potencial.toLocaleString("pt-BR")} pts</strong> · Eficácia {peso}%
          </>
        )}
      </p>
    </div>
  );
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
  pontosCalculados,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Top 4 de {apelido} <span className="text-muted-foreground">· Quota #{numero}</span>
          </DialogTitle>
        </DialogHeader>
        <Top4QuotaContent
          apelido={apelido}
          numero={numero}
          picks={picks}
          teams={teams}
          matches={matches}
          potencial={potencial}
          peso={peso}
          pontosCalculados={pontosCalculados}
          hideHeader
        />
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
