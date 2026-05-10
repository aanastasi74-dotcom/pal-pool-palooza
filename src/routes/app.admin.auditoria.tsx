import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditLog } from "@/lib/queries/audit";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/auditoria")({
  head: () => ({ meta: [{ title: "Admin — Auditoria" }] }),
  component: Auditoria,
});

function Auditoria() {
  const [filtroAcao, setFiltroAcao] = useState("todas");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filters = useMemo(() => ({
    acao: filtroAcao !== "todas" ? filtroAcao : undefined,
    from: dataIni || undefined,
    to: dataFim ? new Date(dataFim + "T23:59:59").toISOString() : undefined,
  }), [filtroAcao, dataIni, dataFim]);

  const { data, isLoading } = useAuditLog(filters);

  const acoes = Array.from(new Set((data ?? []).map((a: any) => a.acao)));

  const { page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(data ?? [], () => true, 25);

  const exportarCsv = () => {
    const rows = ["data,ator,acao,entidade,entidade_id,payload"];
    for (const a of (data ?? []) as any[]) {
      rows.push([new Date(a.created_at).toISOString(), a.ator_nome ?? "", a.acao, a.entidade, a.entidade_id ?? "", JSON.stringify(a.payload ?? {})].map(s => `"${String(s).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auditoria-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Auditoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tudo que rolou no backoffice fica registrado aqui.</p>
        </div>
        <button onClick={exportarCsv} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold">
          <Download className="h-3 w-3" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todas">Todas as ações</option>
          {acoes.map((a) => <option key={a as string} value={a as string}>{a as string}</option>)}
        </select>
        <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">até</span>
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="ml-auto text-xs text-muted-foreground">{total} registro(s) · página {page} de {totalPages}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : total === 0 ? (
        <EmptyState title="Sem registros de auditoria" description="Quando os admins agirem, vai aparecer aqui." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Data/hora</th><th className="p-2 text-left">Ator</th><th className="p-2 text-left">Ação</th><th className="p-2 text-left">Entidade</th><th className="p-2 text-left">ID</th><th className="p-2 text-left">Payload</th></tr></thead>
              <tbody>
                {slice.map((a: any) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 text-xs">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2 font-medium">{a.ator_nome ?? "—"}</td>
                    <td className="p-2 text-xs">{a.acao}</td>
                    <td className="p-2 text-xs">{a.entidade}</td>
                    <td className="p-2 font-mono text-xs">{a.entidade_id ?? "—"}</td>
                    <td className="p-2 text-xs">
                      {a.payload ? (
                        expandido === a.id ? (
                          <pre className="max-w-xs whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(a.payload, null, 2)}</pre>
                        ) : (
                          <button onClick={() => setExpandido(a.id)} className="text-primary underline">ver mais</button>
                        )
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
