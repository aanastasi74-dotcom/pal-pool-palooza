import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ranking } from "@/lib/mock-data";
import { ArrowDown, ArrowUp, Minus, Trophy, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/app/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Bolão dos Perebas" }] }),
  component: Ranking,
});

function Ranking() {
  const [filtroQuota, setFiltroQuota] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const lista = ranking.filter((p) => {
    if (filtroQuota !== "todos" && p.id !== filtroQuota) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Ranking da perebada</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Atualizado em tempo real após cada partida
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5" /></TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Critérios de desempate:</p>
                  <ol className="mt-1 list-decimal pl-4 text-xs">
                    <li>Mais placares exatos</li>
                    <li>Mais resultados certos</li>
                    <li>Ordem alfabética</li>
                  </ol>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar peraba…"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm shadow-card"
          />
          <select
            value={filtroQuota}
            onChange={(e) => setFiltroQuota(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card"
          >
            <option value="todos">Ver quotas de… todos</option>
            {ranking.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{lista.length} de {ranking.length} perebas</p>

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
        {lista.map((p, i) => {
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
                <p className="font-display font-bold">
                  {p.nome}
                  {isMe && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">você</span>}
                </p>
                <p className="text-xs text-muted-foreground">{p.quotas} quota{p.quotas > 1 ? "s" : ""} · {p.exatos} exatos</p>
              </div>
              {isMe && p.evolucao && <Sparkline values={p.evolucao} />}
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

function Sparkline({ values }: { values: number[] }) {
  // valores são posições (menor = melhor). Inverte pra desenhar
  const max = Math.max(...values);
  const w = 60, h = 24;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((max - v) / (max || 1)) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="hidden text-primary sm:block">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Variacao({ v }: { v: number }) {
  if (v === 0) return <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 0</p>;
  if (v > 0) return <p className="flex items-center justify-end gap-1 text-xs font-semibold text-success"><ArrowUp className="h-3 w-3" /> {v}</p>;
  return <p className="flex items-center justify-end gap-1 text-xs font-semibold text-destructive"><ArrowDown className="h-3 w-3" /> {Math.abs(v)}</p>;
}
