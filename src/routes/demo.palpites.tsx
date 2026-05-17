import { createFileRoute } from "@tanstack/react-router";
import { DemoShell, bloqueado } from "@/demo/demo-shell";
import { JOGOS_DEMO, PALPITES_DEMO_USUARIO, getTime } from "@/demo/dados";
import { PlacarJogo } from "@/components/placar-jogo";
import { Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/demo/palpites")({
  head: () => ({ meta: [{ title: "Tour — Palpites" }] }),
  component: DemoPalpites,
});

function DemoPalpites() {
  const total = PALPITES_DEMO_USUARIO.reduce((s, p) => s + (p.pontos ?? 0), 0);
  return (
    <DemoShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> Meus palpites</h1>
            <p className="mt-1 text-sm text-muted-foreground">Quota #1 · {PALPITES_DEMO_USUARIO.length} palpites · <strong>{total} pts</strong></p>
          </div>
        </div>

        <div className="space-y-3">
          {PALPITES_DEMO_USUARIO.map((p) => {
            const j = JOGOS_DEMO.find((x) => x.numero_jogo === p.numero_jogo)!;
            const tc = getTime(j.casa), tf = getTime(j.fora);
            const encerrado = j.status === "encerrado";
            return (
              <div key={p.numero_jogo} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>#{j.numero_jogo} · {j.fase} · peso {j.peso}</span>
                  {encerrado && p.pontos != null && (
                    <span className={`rounded-full px-2 py-0.5 font-bold ${p.pontos > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {p.pontos} pts
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-end gap-2"><span className="font-display text-sm font-bold text-right">{tc.nome}</span><span className="text-2xl">{tc.bandeira}</span></div>
                  <span className="font-display text-2xl font-black text-primary">{p.palpite_casa}</span>
                  <span className="text-xs text-muted-foreground">×</span>
                  <span className="font-display text-2xl font-black text-primary">{p.palpite_fora}</span>
                  <div className="flex items-center gap-2"><span className="text-2xl">{tf.bandeira}</span><span className="font-display text-sm font-bold">{tf.nome}</span></div>
                </div>
                {encerrado && (
                  <div className="mt-3 flex items-center justify-center gap-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    <span>Resultado real:</span>
                    <PlacarJogo
                      placar_casa={j.placar_casa ?? null}
                      placar_fora={j.placar_fora ?? null}
                      placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                      placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                      penaltis_casa={j.penaltis_casa}
                      penaltis_fora={j.penaltis_fora}
                      size="sm"
                    />
                  </div>
                )}
                {!encerrado && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => bloqueado("editar palpite")} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                      <Lock className="h-3 w-3" /> Editar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DemoShell>
  );
}
