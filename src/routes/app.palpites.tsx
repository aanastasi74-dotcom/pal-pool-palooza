import { createFileRoute, Link } from "@tanstack/react-router";
import { times } from "@/lib/mock-data";
import { Sparkles, Trophy, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useMatches } from "@/lib/queries/matches";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyPredictions, useUpsertPrediction } from "@/lib/queries/predictions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/palpites")({
  head: () => ({ meta: [{ title: "Palpites — Bolão dos Perebas" }] }),
  component: Palpites,
});

function travaEm(iso?: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function Palpites() {
  const { data: matches = [], isLoading: loadingM } = useMatches();
  const { data: quotas = [], isLoading: loadingQ } = useMinhasQuotas();
  const [quotaId, setQuotaId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!quotaId && quotas.length) setQuotaId(quotas[0].id);
  }, [quotas, quotaId]);

  const { data: preds = [] } = useMyPredictions(quotaId);
  const upsert = useUpsertPrediction();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const abertos = useMemo(
    () =>
      (matches as any[]).filter(
        (m) => m.status === "agendado" && (!m.travado_em || new Date(m.travado_em).getTime() > Date.now()),
      ),
    [matches],
  );

  const predMap = new Map((preds as any[]).map((p) => [p.match_id, p]));

  const handleChange = (matchId: string, field: "casa" | "fora", raw: string) => {
    if (!quotaId) return;
    const value = raw === "" ? null : Math.max(0, Math.min(99, Number(raw)));
    const pred = predMap.get(matchId);
    const placar_casa = field === "casa" ? value : pred?.placar_casa ?? null;
    const placar_fora = field === "fora" ? value : pred?.placar_fora ?? null;
    upsert.mutate(
      { quota_id: quotaId, match_id: matchId, placar_casa, placar_fora },
      {
        onSuccess: () => {
          const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          setSavedAt(t);
        },
      },
    );
  };

  if (loadingM || loadingQ) return <Skeleton className="h-64 w-full" />;

  if (!quotas.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Você ainda não tem quotas"
        description="Compra uma quota pra começar a palpitar, peraba."
      />
    );
  }

  if (!abertos.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aqui ainda não tem peraba palpitando"
        description="Quando abrir a próxima rodada, é só vir cravar."
      />
    );
  }

  const quotaAtiva = quotas.find((q: any) => q.id === quotaId) ?? quotas[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meus palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quota ativa: <span className="font-semibold text-foreground">Quota #{quotaAtiva.numero}</span>
            {savedAt && <span className="ml-2 text-xs text-success">· Rascunho salvo às {savedAt}</span>}
          </p>
        </div>
        <select
          value={quotaId ?? ""}
          onChange={(e) => setQuotaId(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card"
        >
          {(quotas as any[]).map((q) => (
            <option key={q.id} value={q.id}>Quota #{q.numero}</option>
          ))}
        </select>
      </div>

      <Link
        to="/app/palpites_/top4"
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
        {abertos.map((j) => {
          const pred = predMap.get(j.id);
          const trava = travaEm(j.travado_em);
          const tCasa = times[j.casa] ?? { nome: j.casa, sigla: j.casa, bandeira: "🏳️" };
          const tFora = times[j.fora] ?? { nome: j.fora, sigla: j.fora, bandeira: "🏳️" };
          const dataLabel = new Date(j.data_jogo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          return (
            <article key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{j.fase} · {dataLabel}</span>
                <span className="flex items-center gap-2">
                  {trava && (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                      <Clock className="h-3 w-3" /> Trava em {trava}
                    </span>
                  )}
                  peso {j.peso}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex items-center justify-end gap-3">
                  <p className="hidden font-display font-bold sm:block">{tCasa.nome}</p>
                  <span className="text-3xl">{tCasa.bandeira}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreInput value={pred?.placar_casa} onChange={(v) => handleChange(j.id, "casa", v)} />
                  <span className="text-xl font-bold text-muted-foreground">×</span>
                  <ScoreInput value={pred?.placar_fora} onChange={(v) => handleChange(j.id, "fora", v)} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{tFora.bandeira}</span>
                  <p className="hidden font-display font-bold sm:block">{tFora.nome}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange }: { value?: number | null; onChange: (raw: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      defaultValue={value ?? ""}
      onBlur={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-14 w-14 rounded-2xl border border-border bg-secondary text-center font-display text-2xl font-black focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}
