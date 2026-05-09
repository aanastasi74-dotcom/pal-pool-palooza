import { createFileRoute, Link } from "@tanstack/react-router";
import { jogos, times } from "@/lib/mock-data";
import { Sparkles, Trophy, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/palpites")({
  head: () => ({ meta: [{ title: "Palpites — Bolão dos Perebas" }] }),
  component: Palpites,
});

function Palpites() {
  const abertos = jogos.filter((j) => j.status === "agendado");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // autosave mock: a cada digitação atualiza timestamp
  const onChange = () => {
    const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setSavedAt(t);
  };

  useEffect(() => {
    const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setSavedAt(t);
  }, []);

  if (!abertos.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aqui ainda não tem peraba palpitando"
        description="Quando abrir a próxima rodada, é só vir cravar."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meus palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quota ativa: <span className="font-semibold text-foreground">Quota #1</span>
            {savedAt && <span className="ml-2 text-xs text-success">· Rascunho salvo às {savedAt}</span>}
          </p>
        </div>
        <select className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card">
          <option>Quota #1</option>
          <option>Quota #2</option>
        </select>
      </div>

      <Link
        to="/app/palpites/top4"
        className="flex items-center justify-between rounded-3xl border border-accent/40 bg-gold p-5 text-gold-foreground shadow-card transition hover:scale-[1.01]"
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5" />
          <div>
            <p className="font-display font-bold">Palpite do Top 4</p>
            <p className="text-xs">Vale até 4.000 pontos. Vamos lá, perebas!</p>
          </div>
        </div>
        <span className="text-xs font-bold">Abrir →</span>
      </Link>

      <div className="rounded-2xl border border-accent/40 bg-secondary p-4">
        <div className="flex items-center gap-3 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-semibold">Você ainda tem {abertos.length} jogos abertos para palpitar.</p>
        </div>
      </div>

      <div className="space-y-3">
        {abertos.map((j) => (
          <article key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{j.fase} · {j.data} · {j.hora}</span>
              <span className="flex items-center gap-2">
                {j.travaEm && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                    <Clock className="h-3 w-3" /> Trava em {j.travaEm}
                  </span>
                )}
                peso {j.peso}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex items-center justify-end gap-3">
                <p className="hidden font-display font-bold sm:block">{times[j.casa].nome}</p>
                <span className="text-3xl">{times[j.casa].bandeira}</span>
              </div>
              <div className="flex items-center gap-2">
                <ScoreInput value={j.meuPalpiteCasa} onChange={onChange} />
                <span className="text-xl font-bold text-muted-foreground">×</span>
                <ScoreInput value={j.meuPalpiteFora} onChange={onChange} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{times[j.fora].bandeira}</span>
                <p className="hidden font-display font-bold sm:block">{times[j.fora].nome}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange }: { value?: number; onChange?: () => void }) {
  return (
    <input
      type="number"
      min={0}
      defaultValue={value ?? ""}
      onChange={onChange}
      placeholder="-"
      className="h-14 w-14 rounded-2xl border border-border bg-secondary text-center font-display text-2xl font-black focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}
