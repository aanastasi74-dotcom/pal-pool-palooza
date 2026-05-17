import { createFileRoute } from "@tanstack/react-router";
import { DemoShell } from "@/demo/demo-shell";
import { RANKING_DEMO, PEREBA_VOCE_ID, getPereba } from "@/demo/dados";
import { ListOrdered, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

export const Route = createFileRoute("/demo/ranking")({
  head: () => ({ meta: [{ title: "Tour — Ranking" }] }),
  component: DemoRanking,
});

function DemoRanking() {
  return (
    <DemoShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2"><ListOrdered className="h-7 w-7 text-primary" /> Ranking geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">{RANKING_DEMO.length} perebas na disputa · atualizado em tempo real</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Pereba</th>
                <th className="px-3 py-2 text-right">Pontos</th>
                <th className="px-3 py-2 text-right">Var</th>
              </tr>
            </thead>
            <tbody>
              {RANKING_DEMO.map((r, i) => {
                const p = getPereba(r.pereba_id);
                const voce = r.pereba_id === PEREBA_VOCE_ID;
                const podio = i < 3;
                return (
                  <tr key={r.pereba_id} className={`border-t border-border ${voce ? "bg-primary/10 font-bold" : ""}`}>
                    <td className="px-3 py-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                        podio ? (i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-amber-700 text-white") : "bg-muted text-muted-foreground"
                      }`}>
                        {podio && i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: p?.cor }}>
                          {p?.sigla}
                        </span>
                        <div className="leading-tight">
                          <p className="font-display text-sm font-bold">{p?.apelido}{voce && " (você)"}</p>
                          <p className="text-[10px] text-muted-foreground">{p?.nome}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-display font-extrabold">{r.pontos}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs ${
                        r.variacao > 0 ? "text-emerald-600" : r.variacao < 0 ? "text-rose-600" : "text-muted-foreground"
                      }`}>
                        {r.variacao > 0 ? <TrendingUp className="h-3 w-3" /> : r.variacao < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {r.variacao !== 0 && Math.abs(r.variacao)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DemoShell>
  );
}
