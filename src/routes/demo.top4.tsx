import { createFileRoute } from "@tanstack/react-router";
import { DemoShell, bloqueado } from "@/demo/demo-shell";
import { TOP4_DEMO, getTime } from "@/demo/dados";
import { Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/demo/top4")({
  head: () => ({ meta: [{ title: "Tour — Top 4" }] }),
  component: DemoTop4,
});

function DemoTop4() {
  const picks = [TOP4_DEMO.posicao_1, TOP4_DEMO.posicao_2, TOP4_DEMO.posicao_3, TOP4_DEMO.posicao_4];

  return (
    <DemoShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Top 4 da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quem leva a taça e quem fica no quase. Vale até 4.000 pts.</p>
        </div>

        <section className="rounded-2xl border border-success/40 bg-success/10 p-4 text-success shadow-card">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5" />
            <div>
              <p className="font-display font-bold">
                Perebada, a Copa ainda não começou — cada acerto aqui vale 1000 pontos. Potencial máximo: 4000 pts
              </p>
              <p className="mt-1 text-xs opacity-80">
                Estamos em: <strong>Antes da Copa</strong> · eficácia <strong>{TOP4_DEMO.peso_no_palpite}%</strong> · potencial máx. <strong>4.000 pts</strong>
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {picks.map((code, i) => {
            const time = getTime(code);
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-gold-foreground">
                  {i + 1}º
                </div>
                <span className="text-3xl">{time.bandeira}</span>
                <select
                  value={code}
                  disabled
                  className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 font-display font-bold opacity-60"
                >
                  <option value={code}>{time.bandeira} {time.nome}</option>
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => bloqueado("alterar Top 4")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            <Lock className="h-3.5 w-3.5" /> Alterar palpite Top 4
          </button>
        </div>
      </div>
    </DemoShell>
  );
}
