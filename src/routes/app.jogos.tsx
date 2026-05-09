import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { jogos, times } from "@/lib/mock-data";
import { Lock, Radio, CalendarSearch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/jogos")({
  head: () => ({ meta: [{ title: "Jogos — Bolão dos Perebas" }] }),
  component: Jogos,
});

const filtros = ["Todos", "Hoje", "Fase de grupos", "Oitavas", "Quartas", "Semifinais", "Final"];

function Jogos() {
  const [filtro, setFiltro] = useState("Todos");
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const lista = jogos.filter((j) => {
    if (filtro === "Todos") return true;
    if (filtro === "Hoje") return j.data === hoje;
    return j.fase.toLowerCase() === filtro.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">104 partidas · palpites travam 5 minutos antes do apito inicial</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              filtro === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="Nenhum jogo nesse filtro"
          description="Tenta mudar pra outra fase — a perebada não palpita no vazio."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((j) => (
            <article key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold">{j.fase} · {j.estadio}</span>
                <span className="flex items-center gap-2">
                  {j.status === "ao-vivo" && (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                      <Radio className="h-3 w-3 animate-pulse" /> AO VIVO
                    </span>
                  )}
                  <span>peso {j.peso}</span>
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <p className="font-display font-bold">{times[j.casa].nome}</p>
                    <p className="text-xs text-muted-foreground">{times[j.casa].sigla}</p>
                  </div>
                  <span className="text-3xl">{times[j.casa].bandeira}</span>
                </div>

                <div className="text-center">
                  {j.status === "encerrado" || j.status === "ao-vivo" ? (
                    <p className="font-display text-3xl font-black">{j.placarCasa} <span className="text-muted-foreground">·</span> {j.placarFora}</p>
                  ) : (
                    <p className="font-display text-lg font-bold">{j.data}<br /><span className="text-sm text-muted-foreground">{j.hora}</span></p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-3xl">{times[j.fora].bandeira}</span>
                  <div>
                    <p className="font-display font-bold">{times[j.fora].nome}</p>
                    <p className="text-xs text-muted-foreground">{times[j.fora].sigla}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Seu palpite</p>
                  <p className="font-display text-base font-bold">
                    {j.meuPalpiteCasa !== undefined ? `${j.meuPalpiteCasa} × ${j.meuPalpiteFora}` : <span className="text-destructive">— sem palpite —</span>}
                  </p>
                </div>
                {j.status === "agendado" ? (
                  <div className="flex items-center gap-2">
                    {j.travaEm && (
                      <span className="rounded-full bg-accent/40 px-2 py-1 text-[10px] font-bold text-accent-foreground">
                        trava em {j.travaEm}
                      </span>
                    )}
                    <button className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                      {j.meuPalpiteCasa !== undefined ? "Editar" : "Palpitar"}
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" /> travado
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
