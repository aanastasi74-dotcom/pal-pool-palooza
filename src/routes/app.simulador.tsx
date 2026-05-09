import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { times } from "@/lib/mock-data";
import { toast } from "sonner";
import { RotateCcw, Share2 } from "lucide-react";

export const Route = createFileRoute("/app/simulador")({
  head: () => ({ meta: [{ title: "Simulador — Bolão dos Perebas" }] }),
  component: Simulador,
});

const inicial = {
  oitavas: ["BRA", "POR", "ARG", "HOL", "FRA", "ESP", "ALE", "ING"],
};

function Simulador() {
  const [picks, setPicks] = useState({
    quartas: ["BRA", "ARG", "FRA", "ESP"],
    semis: ["BRA", "FRA"],
    final: "BRA",
    campeao: "BRA",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Simulador da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Brinque com o chaveamento. Não vale pontos — só zoeira.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPicks({ quartas: [], semis: [], final: "", campeao: "" })}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold"
          >
            <RotateCcw className="h-3 w-3" /> Resetar
          </button>
          <button
            onClick={() => toast.success("Simulação copiada — manda no grupo!")}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Share2 className="h-3 w-3" /> Compartilhar
          </button>
        </div>
      </div>

      <Fase title="Oitavas" teams={inicial.oitavas} cols={4} />
      <Fase title="Quartas" teams={picks.quartas} cols={2} />
      <Fase title="Semifinais" teams={picks.semis} cols={2} />
      <Fase title="Final" teams={[picks.final].filter(Boolean)} cols={1} />

      <section className="rounded-3xl bg-hero p-6 text-center text-primary-foreground shadow-glow">
        <p className="text-xs uppercase tracking-widest opacity-80">Seu campeão</p>
        <p className="mt-2 font-display text-5xl font-black">{picks.campeao ? times[picks.campeao]?.bandeira : "🏆"}</p>
        <p className="mt-1 font-display text-2xl font-bold">{picks.campeao ? times[picks.campeao]?.nome : "A definir"}</p>
      </section>
    </div>
  );
}

function Fase({ title, teams, cols }: { title: string; teams: string[]; cols: number }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className={`mt-3 grid gap-2 grid-cols-${cols}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {teams.map((t, i) => (
          <div key={i} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
            <span className="text-2xl">{times[t]?.bandeira}</span>
            <span className="font-display font-bold">{times[t]?.nome ?? "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
