import { createFileRoute } from "@tanstack/react-router";
import { jogos, times } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/palpites")({
  head: () => ({ meta: [{ title: "Palpites — Bolão da Galera" }] }),
  component: Palpites,
});

function Palpites() {
  const abertos = jogos.filter((j) => j.status === "agendado");
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meus palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quota ativa: <span className="font-semibold text-foreground">Quota #1</span></p>
        </div>
        <select className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card">
          <option>Quota #1</option>
          <option>Quota #2</option>
        </select>
      </div>

      <div className="rounded-3xl border border-accent/40 bg-gold p-5 text-gold-foreground shadow-card">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" />
          <p className="text-sm font-semibold">Você ainda tem {abertos.length} jogos abertos para palpitar.</p>
        </div>
      </div>

      <div className="space-y-3">
        {abertos.map((j) => (
          <article key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{j.fase} · {j.data} · {j.hora}</span>
              <span>peso {j.peso}</span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex items-center justify-end gap-3">
                <p className="font-display font-bold">{times[j.casa].nome}</p>
                <span className="text-3xl">{times[j.casa].bandeira}</span>
              </div>
              <div className="flex items-center gap-2">
                <ScoreInput value={j.meuPalpiteCasa} />
                <span className="text-xl font-bold text-muted-foreground">×</span>
                <ScoreInput value={j.meuPalpiteFora} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{times[j.fora].bandeira}</span>
                <p className="font-display font-bold">{times[j.fora].nome}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Salvar palpite</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScoreInput({ value }: { value?: number }) {
  return (
    <input
      type="number"
      min={0}
      defaultValue={value ?? ""}
      placeholder="-"
      className="h-14 w-14 rounded-2xl border border-border bg-secondary text-center font-display text-2xl font-black focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}
