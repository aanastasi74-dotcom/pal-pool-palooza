import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react";
import { DemoShell } from "@/demo/demo-shell";
import { RANKING_DEMO, PEREBA_VOCE_ID, getPereba } from "@/demo/dados";

export const Route = createFileRoute("/demo/ranking")({
  head: () => ({ meta: [{ title: "Tour — Ranking" }] }),
  component: DemoRanking,
});

function DemoRanking() {
  return (
    <DemoShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Ranking da perebada</h1>
            <p className="mt-1 text-sm text-muted-foreground">Atualizado em tempo real após cada partida</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{RANKING_DEMO.length} quotas</p>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {RANKING_DEMO.map((r, i) => {
            const p = getPereba(r.pereba_id);
            const isMe = r.pereba_id === PEREBA_VOCE_ID;
            const apelido = p?.apelido ?? "—";
            const sigla = (p?.sigla ?? "??").slice(0, 3).toUpperCase();
            const cor = p?.cor ?? "oklch(0.6 0.16 200)";
            return (
              <div
                key={r.pereba_id}
                className={`flex items-center gap-4 border-b border-border px-4 py-4 last:border-0 ${isMe ? "bg-secondary" : ""}`}
              >
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <Trophy className={`mx-auto h-5 w-5 ${i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : "text-amber-700"}`} />
                  ) : (
                    <span className="font-display font-bold text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: cor }}
                >
                  {sigla}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold">
                    {apelido}
                    {isMe && (
                      <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">você</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Quota #{i + 1}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">{r.pontos.toLocaleString("pt-BR")}</p>
                  <Variacao v={r.variacao} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DemoShell>
  );
}

function Variacao({ v }: { v: number }) {
  if (v === 0)
    return (
      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0
      </p>
    );
  if (v > 0)
    return (
      <p className="flex items-center justify-end gap-1 text-xs font-semibold text-success">
        <ArrowUp className="h-3 w-3" /> {v}
      </p>
    );
  return (
    <p className="flex items-center justify-end gap-1 text-xs font-semibold text-destructive">
      <ArrowDown className="h-3 w-3" /> {Math.abs(v)}
    </p>
  );
}
