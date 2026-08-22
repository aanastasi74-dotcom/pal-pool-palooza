import { Trophy, Lock } from "lucide-react";
import { useRankingFinal } from "@/lib/queries/ranking-final";

const MEDALHAS = ["🥇", "🥈", "🥉"];

export function VitrinePodio() {
  const { data: ranking = [], isLoading } = useRankingFinal();
  const top3 = ranking.filter((r) => r.posicao_oficial <= 3).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-10">
      <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-accent/30 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur">
            <Lock className="h-3 w-3" /> Encerrada · 11/06 → 19/07/2026
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">
          Copa do Mundo 2026
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs opacity-80">
          <Trophy className="h-3.5 w-3.5" /> O memorial da perebada
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {isLoading && top3.length === 0
            ? [0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/10" />
              ))
            : top3.map((r, i) => (
                <div
                  key={r.quota_id}
                  className={`rounded-2xl p-4 backdrop-blur ring-1 ${
                    i === 0 ? "bg-white/25 ring-white/40" : "bg-white/10 ring-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{MEDALHAS[i]}</span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold leading-tight">
                        {r.apelido}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest opacity-70">
                        quota #{r.numero_quota}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 font-display text-xl font-black">
                    {r.pontos_finais.toLocaleString("pt-BR")}
                    <span className="ml-1 text-xs font-bold opacity-70">pts</span>
                  </p>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
