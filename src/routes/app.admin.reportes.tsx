import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { useReports, useUpdateReportStatus } from "@/lib/queries/reports";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/reportes")({
  head: () => ({ meta: [{ title: "Admin — Reportes" }] }),
  component: ReportesAdmin,
});

const sevColor: Record<string, string> = {
  critico: "bg-destructive/15 text-destructive",
  importante: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  menor: "bg-muted text-muted-foreground",
};

const stColor: Record<string, string> = {
  aberto: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  em_analise: "bg-primary/15 text-primary",
  resolvido: "bg-success/15 text-success",
};

function ReportesAdmin() {
  const { data, isLoading } = useReports();
  const updateStatus = useUpdateReportStatus();

  const predicate = useCallback(
    (r: any, q: string) => !q || [r.descricao, r.autor_nome, r.url].join(" ").toLowerCase().includes(q),
    [],
  );
  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(data ?? [], predicate, 20);

  const setStatus = async (id: string, status: string) => {
    await updateStatus.mutateAsync({ id, status });
    toast.success("Status atualizado.");
  };

  const abertos = (data ?? []).filter((r: any) => r.status === "aberto").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Reportes da perebada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {(data ?? []).length} reportes · {abertos} abertos
        </p>
      </div>

      <Input placeholder="Buscar por descrição, autor ou URL…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
      <p className="text-xs text-muted-foreground">{total} resultado(s) · página {page} de {totalPages}</p>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : total === 0 ? (
        <EmptyState title="Sem reportes por aqui" description="Perebada tá feliz." />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-xs">
                    <p className="font-medium">{r.descricao}</p>
                    <p className="text-[11px] text-muted-foreground">{r.url}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sevColor[r.severidade] ?? sevColor.menor}`}>
                      {r.severidade}
                    </span>
                  </TableCell>
                  <TableCell>{r.autor_nome ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      className={`rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold ${stColor[r.status] ?? ""}`}
                    >
                      <option value="aberto">Aberto</option>
                      <option value="em_analise">Em análise</option>
                      <option value="resolvido">Resolvido</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
