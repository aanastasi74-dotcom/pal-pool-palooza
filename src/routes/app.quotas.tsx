import { createFileRoute, Link } from "@tanstack/react-router";
import { minhasQuotas } from "@/lib/mock-data";
import { Plus } from "lucide-react";

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
