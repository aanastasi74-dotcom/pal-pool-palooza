import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { times, janelasTop4 } from "@/lib/mock-data";
import { Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/palpites_/top4")({
  head: () => ({ meta: [{ title: "Top 4 — Bolão dos Perebas" }] }),
  component: Top4,
});

const candidatos = ["BRA", "ARG", "FRA", "ESP", "ALE", "ING", "POR", "HOL", "URU"];

function Top4() {
  const [picks, setPicks] = useState<string[]>(["BRA", "ARG", "FRA", "ESP"]);
  const ativa = janelasTop4.find((j) => j.ativa)!;
  const custo = Math.round((100 - ativa.eficacia) * 4);

  const setPos = (i: number, v: string) => {
    const idxAntigo = picks.indexOf(v);
    const next = [...picks];
    if (idxAntigo !== -1 && idxAntigo !== i) {
      // troca automática
      next[idxAntigo] = picks[i];
      next[i] = v;
      toast.info(`Trocado com a ${idxAntigo + 1}ª posição.`);
    } else {
      next[i] = v;
    }
    setPicks(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Top 4 da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quem leva a taça e quem fica no quase. Vale até 4.000 pts.</p>
      </div>

      <section className="rounded-2xl border border-accent/40 bg-gold p-4 text-gold-foreground shadow-card">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5" />
          <div>
            <p className="font-display font-bold">Janela atual: {ativa.fase}</p>
            <p className="text-xs">Eficácia agora: <span className="font-bold">{ativa.eficacia}%</span></p>
          </div>
        </div>
      </section>

      {picks.some((p, i) => p !== ["BRA", "ARG", "FRA", "ESP"][i]) && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Mudar agora custa cerca de {custo} pts pela eficácia reduzida.
        </div>
      )}

      <div className="space-y-3">
        {picks.map((pick, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-gold-foreground">
              {i + 1}º
            </div>
            <span className="text-3xl">{times[pick]?.bandeira ?? "🏳️"}</span>
            <select
              value={pick}
              onChange={(e) => setPos(i, e.target.value)}
              className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {candidatos.map((c) => {
                const usadoEm = picks.indexOf(c);
                const desabilitado = usadoEm !== -1 && usadoEm !== i;
                return (
                  <option key={c} value={c} disabled={desabilitado}>
                    {times[c]?.nome}{desabilitado ? ` (na ${usadoEm + 1}ª)` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const unicos = new Set(picks);
          if (unicos.size !== picks.length) {
            toast.error("Cada time só pode aparecer uma vez no Top 4");
            return;
          }
          toast.success("Top 4 salvo. Boa sorte, perebada!");
        }}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
      >
        Salvar palpite Top 4
      </button>
    </div>
  );
}
