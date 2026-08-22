import { Link } from "@tanstack/react-router";
import { Newspaper, ListOrdered, CalendarDays, Trophy, ChevronRight } from "lucide-react";

const ITENS = [
  {
    to: "/app/boletins",
    icon: Newspaper,
    titulo: "Boletins",
    detalhe: "38 edições · 53.790 palavras",
  },
  {
    to: "/app/jogos",
    icon: CalendarDays,
    titulo: "Jogos",
    detalhe: "104 jogos · 306 gols",
  },
  {
    to: "/app/ranking",
    icon: ListOrdered,
    titulo: "Ranking completo",
    detalhe: "Classificação final da perebada",
  },
  {
    to: "/app/premio",
    icon: Trophy,
    titulo: "Prêmio",
    detalhe: "Premiação e prestação de contas",
  },
] as const;

export function VitrineColecao() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ITENS.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40 hover:shadow-glow"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold leading-tight">{it.titulo}</p>
              <p className="break-words text-xs text-muted-foreground">{it.detalhe}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}
