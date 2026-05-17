import { createFileRoute } from "@tanstack/react-router";
import { DemoShell, bloqueado } from "@/demo/demo-shell";
import { JOGOS_DEMO, getTime } from "@/demo/dados";
import { PlacarJogo } from "@/components/placar-jogo";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/demo/jogos")({
  head: () => ({ meta: [{ title: "Tour — Jogos" }] }),
  component: DemoJogos,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function DemoJogos() {
  return (
    <DemoShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">{JOGOS_DEMO.length} partidas · palpites travam 5 min antes do apito</p>
        </div>

        <div className="space-y-3">
          {JOGOS_DEMO.map((j) => {
            const tc = getTime(j.casa), tf = getTime(j.fora);
            const encerrado = j.status === "encerrado";
            return (
              <div key={j.numero_jogo} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Jogo #{j.numero_jogo} · {j.fase} · peso {j.peso}</span>
                  <span>{fmt(j.data_jogo)} · {j.estadio}, {j.cidade}</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                    <span className="font-display text-sm font-bold sm:text-base text-right">{tc.nome}</span>
                    <span className="text-2xl sm:text-3xl">{tc.bandeira}</span>
                  </div>
                  <div className="text-center">
                    {encerrado ? (
                      <PlacarJogo
                        placar_casa={j.placar_casa ?? null}
                        placar_fora={j.placar_fora ?? null}
                        placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                        placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                        penaltis_casa={j.penaltis_casa}
                        penaltis_fora={j.penaltis_fora}
                      />
                    ) : (
                      <span className="font-display text-2xl text-muted-foreground">vs</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl">{tf.bandeira}</span>
                    <span className="font-display text-sm font-bold sm:text-base">{tf.nome}</span>
                  </div>
                </div>
                {!encerrado && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => bloqueado("editar palpite")}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <Lock className="h-3 w-3" /> Palpitar
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
