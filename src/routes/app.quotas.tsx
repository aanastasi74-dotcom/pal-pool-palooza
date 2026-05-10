import { createFileRoute, Link } from "@tanstack/react-router";
import { minhasQuotas, TOTAL_QUOTAS } from "@/lib/mock-data";
import { Plus, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { estaNosUltimos25, isElegivelLanterna, razaoNaoElegivel } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/quotas")({
  head: () => ({ meta: [{ title: "Minhas quotas — Bolão dos Perebas" }] }),
  component: QuotasPage,
});

const labelStatus = {
  ativa: { txt: "Ativa", cls: "bg-success/15 text-success" },
  aguardando_aprovacao: { txt: "Aguardando aprovação", cls: "bg-accent/30 text-accent-foreground" },
  expirada: { txt: "Expirada", cls: "bg-destructive/15 text-destructive" },
};

function QuotasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Minhas quotas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cada quota é um time independente no bolão.</p>
        </div>
        <Link
          to="/app/pagamento/$quota_id"
          params={{ quota_id: "nova" }}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> Comprar nova quota
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {minhasQuotas.map((q) => {
          const s = labelStatus[q.status];
          const noFundo = estaNosUltimos25(q.posicao, TOTAL_QUOTAS);
          const elegivel = isElegivelLanterna(q);
          const razao = razaoNaoElegivel(q);
          return (
            <article key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-bold">Quota #{q.numero}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.txt}</span>
              </div>
              {q.pagaEm && <p className="mt-1 text-xs text-muted-foreground">Paga em {q.pagaEm}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Pontos" valor={q.pontos.toLocaleString("pt-BR")} />
                <Stat label="Posição" valor={`${q.posicao}º`} />
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
