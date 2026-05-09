import { createFileRoute } from "@tanstack/react-router";
import { ranking } from "@/lib/mock-data";
import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react";

export const Route = createFileRoute("/app/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Bolão da Galera" }] }),
  component: Ranking,
});

function Ranking() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Ranking geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualizado em tempo real após cada partida</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Geral", "Diário", "Fase de grupos", "Mata-mata"].map((f, i) => (
          <button
            key={f}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
              i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {ranking.map((p, i) => {
          const isMe = p.nome === "Você";
          return (
            <div
              key={p.id}
              className={`flex items-center gap-4 border-b border-border px-4 py-4 last:border-0 ${
                isMe ? "bg-secondary" : ""
              }`}
            >
              <div className="w-8 text-center">
                {i < 3 ? (
                  <Trophy className={`mx-auto h-5 w-5 ${i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : "text-amber-700"}`} />
                ) : (
                  <span className="font-display font-bold text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: p.cor }}>
                {p.apelido}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold">{p.nome} {isMe && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">você</span>}</p>
                <p className="text-xs text-muted-foreground">{p.quotas} quota{p.quotas > 1 ? "s" : ""} · {p.exatos} exatos</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold">{p.pontos.toLocaleString("pt-BR")}</p>
                <Variacao v={p.variacao} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Variacao({ v }: { v: number }) {
  if (v === 0) return <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 0</p>;
  if (v > 0) return <p className="flex items-center justify-end gap-1 text-xs font-semibold text-success"><ArrowUp className="h-3 w-3" /> {v}</p>;
  return <p className="flex items-center justify-end gap-1 text-xs font-semibold text-destructive"><ArrowDown className="h-3 w-3" /> {Math.abs(v)}</p>;
}
