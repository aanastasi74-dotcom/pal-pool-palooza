import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminPesquisas } from "@/lib/queries/pesquisas";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/admin/pesquisas")({
  head: () => ({ meta: [{ title: "Admin — Pesquisas" }] }),
  component: PesquisasAdmin,
});

function statusOf(p: { ativa: boolean; encerra_em: string; abre_em: string }): { label: string; cls: string } {
  const now = new Date();
  const encerra = new Date(p.encerra_em);
  if (!p.ativa) return { label: "Rascunho", cls: "bg-muted text-muted-foreground" };
  if (encerra < now) return { label: "Encerrada", cls: "bg-secondary text-secondary-foreground" };
  return { label: "Ativa", cls: "bg-primary text-primary-foreground" };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function PesquisasAdmin() {
  const { data, isLoading } = useAdminPesquisas();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Pesquisas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pesquisas com a perebada — resultados e criação.</p>
        </div>
        <Link
          to="/app/admin/pesquisas/$id"
          params={{ id: "novo" }}
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Nova pesquisa
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sem pesquisas ainda" description="Crie a primeira." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Título</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Janela</th>
                <th className="p-2 text-right">Concluídas</th>
                <th className="p-2 text-right">Iniciadas</th>
                <th className="p-2 text-right">Opt-out</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: any) => {
                const s = statusOf(p);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2">
                      <Link
                        to="/app/admin/pesquisas/$id"
                        params={{ id: p.id }}
                        className="font-display font-bold hover:underline"
                      >
                        {p.titulo}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">/{p.slug}</div>
                    </td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {fmt(p.abre_em)} → {fmt(p.encerra_em)}
                    </td>
                    <td className="p-2 text-right font-bold">{p.concluidas}</td>
                    <td className="p-2 text-right">{p.iniciadas}</td>
                    <td className="p-2 text-right">{p.opt_out}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
