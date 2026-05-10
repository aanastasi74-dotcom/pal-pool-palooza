import { Link } from "@tanstack/react-router";
import { Trophy, Radio } from "lucide-react";
import { usePremio } from "@/lib/queries/premio";
import { CountUp } from "./count-up";

const fmtBRL = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export function PrizeBanner() {
  const { data: premio } = usePremio();
  if (!premio) return null;
  const pct = premio.meta > 0 ? Math.min(100, (premio.total_confirmado / premio.meta) * 100) : 0;
  const atualizado = new Date(premio.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      to="/app/premio"
      className="block border-b border-border bg-gold/15 backdrop-blur transition hover:bg-gold/25"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:gap-6 md:py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold text-gold-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prêmio confirmado</p>
            <p className="font-display text-lg font-extrabold leading-none md:text-2xl">
              <CountUp value={premio.total_confirmado} format={fmtBRL} />
            </p>
          </div>
          <div className="hidden leading-tight md:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Potencial</p>
            <p className="font-display text-base font-bold text-muted-foreground">
              {fmtBRL(premio.total_confirmado + premio.total_pendente)}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-hero transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
            {premio.quotas_pagas}/{premio.quotas_pagas + premio.quotas_pendentes} quotas
          </p>
        </div>

        <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-success md:flex">
          <Radio className="h-3 w-3 animate-pulse" />
          ao vivo · {atualizado}
        </div>
      </div>
    </Link>
  );
}
