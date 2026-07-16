import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { useWrappedLiberado } from "@/lib/queries/wrapped";

/** Card no feed da home. Renderiza apenas se settings.wrapped_liberado=true. */
export function WrappedCard() {
  const { data: liberado } = useWrappedLiberado();
  if (!liberado) return null;
  return (
    <Link
      to="/app/wrapped"
      className="block rounded-3xl border-2 border-accent bg-gradient-to-br from-primary via-primary to-accent p-5 text-primary-foreground shadow-glow transition hover:scale-[1.01]"
    >
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
          <Gift className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest opacity-80">Retrospectiva 2026</p>
          <p className="font-display text-xl font-black leading-tight">Seu Wrapped da Copa chegou</p>
          <p className="mt-1 text-xs opacity-90">
            Uma retrospectiva do seu bolão em 8 telas. Toca pra ver.
          </p>
        </div>
      </div>
    </Link>
  );
}
