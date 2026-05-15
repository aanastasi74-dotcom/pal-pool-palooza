import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, CheckCircle2, AlertCircle, Lightbulb, ListChecks, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { estaNosUltimos25, isElegivelLanterna, razaoNaoElegivel } from "@/lib/lanterninha";
import { useMinhasQuotas, useTotalQuotas } from "@/lib/queries/quotas";
import { useMyLotes } from "@/lib/queries/lotes";
import { usePodeCriarQuota } from "@/lib/queries/copa";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/quotas")({
  head: () => ({ meta: [{ title: "Minhas quotas — Bolão dos Perebas" }] }),
  component: QuotasPage,
});

const labelStatus: Record<string, { txt: string; cls: string }> = {
  ativa: { txt: "Ativa", cls: "bg-success/15 text-success" },
  aguardando_aprovacao: { txt: "Aguardando aprovação", cls: "bg-accent/30 text-accent-foreground" },
  expirada: { txt: "Expirada", cls: "bg-destructive/15 text-destructive" },
  rejeitada: { txt: "Rejeitada", cls: "bg-destructive/15 text-destructive" },
  encerrada: { txt: "Encerrada", cls: "bg-muted text-muted-foreground" },
};

function QuotasPage() {
  const navigate = useNavigate();
  const [mostrarEncerradas, setMostrarEncerradas] = useState(false);
  const { data: quotasAll = [], isLoading } = useMinhasQuotas({ includeEncerradas: true });
  const quotas = useMemo(
    () => (mostrarEncerradas ? quotasAll : (quotasAll as any[]).filter((q) => q.status !== "encerrada")),
    [quotasAll, mostrarEncerradas],
  );
  const encerradasCount = useMemo(
    () => (quotasAll as any[]).filter((q) => q.status === "encerrada").length,
    [quotasAll],
  );
  const { data: totalQuotas = 0 } = useTotalQuotas();
  const { data: lotes = [] } = useMyLotes();
  const { data: podeCriar = true } = usePodeCriarQuota();

  // Identifica lotes 100% rejeitados pra agrupar visualmente em 1 card único
  const { lotesRejeitadosGroups, quotasIndividuais } = useMemo(() => {
    const lotesRejeitados = (lotes as any[]).filter((l) => l.status === "rejeitado");
    const groups: Array<{ lote: any; quotas: any[] }> = [];
    const consumedQuotaIds = new Set<string>();
    for (const lote of lotesRejeitados) {
      const quotasDoLote = (quotas as any[]).filter((q) => q.lote_id === lote.id);
      if (quotasDoLote.length === 0) continue;
      const todasRejeitadas = quotasDoLote.every((q) => q.status === "rejeitada");
      if (todasRejeitadas && quotasDoLote.length > 1) {
        groups.push({ lote, quotas: quotasDoLote });
        quotasDoLote.forEach((q) => consumedQuotaIds.add(q.id));
      }
    }
    const indiv = (quotas as any[]).filter((q) => !consumedQuotaIds.has(q.id));
    return { lotesRejeitadosGroups: groups, quotasIndividuais: indiv };
  }, [quotas, lotes]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Minhas quotas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cada quota é um time independente no bolão.</p>
        </div>
        {podeCriar ? (
          <button
            onClick={() => navigate({ to: "/app/comprar-quota" })}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Comprar quotas
          </button>
        ) : null}
      </div>

      {!podeCriar && (
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-xs">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Quotas encerradas</b> — a Copa já começou. Boa sorte aos perebas inscritos! 🍀</p>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : quotas.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Você ainda não tem quotas"
          description="Compra a primeira e bora pra perebada."
        />
      ) : (
        <div className="space-y-3">
          {lotesRejeitadosGroups.map(({ lote, quotas: qs }) => {
            const tent = lote.tentativas_comprovante ?? 0;
            return (
              <article key={`lote-${lote.id}`} className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-destructive">
                      Lote de {qs.length} quotas rejeitadas
                    </p>
                    {lote.motivo_rejeicao && (
                      <p className="mt-1 text-xs text-foreground">Motivo: {lote.motivo_rejeicao}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tentativas usadas: {tent} de 3
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    Rejeitado
                  </span>
                </div>
                <button
                  onClick={() => navigate({ to: "/app/pagamento-lote/$lote_id", params: { lote_id: lote.id } })}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Reenviar comprovante do lote ({qs.length} quotas)
                </button>
              </article>
            );
          })}

          <div className="grid gap-3 md:grid-cols-2">
            {quotasIndividuais.map((q: any) => {
              const s = labelStatus[q.status] ?? { txt: q.status, cls: "bg-muted text-muted-foreground" };
              const noFundo = estaNosUltimos25(q.posicao ?? 9999, totalQuotas);
              const elegivel = isElegivelLanterna(q);
              const razao = razaoNaoElegivel(q);
              return (
                <article key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xl font-bold">Quota {q.numero ? `#${q.numero}` : "(sem número)"}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.txt}</span>
                  </div>
                  {q.paga_em && <p className="mt-1 text-xs text-muted-foreground">Paga em {new Date(q.paga_em).toLocaleDateString("pt-BR")}</p>}

                  {q.status === "rejeitada" && (
                    <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
                      <p className="font-bold text-destructive">❌ Rejeitada</p>
                      {q.motivo_rejeicao && <p className="mt-1 text-foreground">Motivo: {q.motivo_rejeicao}</p>}
                      <p className="mt-1 text-muted-foreground">
                        Tentativas usadas: {q.tentativas_comprovante ?? 0} de 3
                      </p>
                      <button
                        onClick={() => navigate({ to: "/app/pagamento/$quota_id", params: { quota_id: q.id } })}
                        className="mt-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                      >
                        Enviar novo comprovante
                      </button>
                    </div>
                  )}
                  {q.status === "encerrada" && (
                    <div className="mt-3 rounded-xl border border-muted-foreground/30 bg-muted/40 p-3 text-xs">
                      <p className="font-bold">Quota encerrada após 3 tentativas.</p>
                      <p className="mt-1 text-muted-foreground">Clique em "Comprar quotas" pra começar uma nova.</p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Stat label="Pontos" valor={(q.pontos ?? 0).toLocaleString("pt-BR")} />
                    <Stat label="Posição" valor={q.posicao ? `${q.posicao}º` : "—"} />
                  </div>
                  {noFundo && (
                    <div
                      className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                        elegivel ? "bg-success/10 text-success" : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {elegivel ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        <Lightbulb className="mr-1 inline h-3 w-3 rotate-180" />
                        {elegivel ? "Elegível ao lanterninha" : `Não elegível ao lanterninha — ${razao}`}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="font-display text-2xl font-bold">{valor}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
