import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { reportes, type Reporte } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";

export const Route = createFileRoute("/app/admin/reportes")({
  head: () => ({ meta: [{ title: "Admin — Reportes" }] }),
  component: ReportesAdmin,
});

const sevColor: Record<Reporte["severidade"], string> = {
  critico: "bg-destructive/15 text-destructive",
  importante: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  menor: "bg-muted text-muted-foreground",
};

const stColor: Record<Reporte["status"], string> = {
  aberto: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  em_analise: "bg-primary/15 text-primary",
  resolvido: "bg-success/15 text-success",
};

function ReportesAdmin() {
  const [, force] = useState(0);

  const predicate = useCallback(
    (r: Reporte, q: string) => !q || [r.descricao, r.autor, r.url].join(" ").toLowerCase().includes(q),
    [],
  );
  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(reportes, predicate, 20);

  const setStatus = (id: string, status: Reporte["status"]) => {
    const r = reportes.find((x) => x.id === id);
    if (r) {
      r.status = status;
      force((n) => n + 1);
      toast.success("Status atualizado.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Reportes da perebada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reportes.length} reportes · {reportes.filter((r) => r.status === "aberto").length} abertos
        </p>
      </div>

      <Input placeholder="Buscar por descrição, autor ou URL…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
      <p className="text-xs text-muted-foreground">{total} resultado(s) · página {page} de {totalPages}</p>

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
            {slice.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-xs">
                  <p className="font-medium">{r.descricao}</p>
                  <p className="text-[11px] text-muted-foreground">{r.url}</p>
                </TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sevColor[r.severidade]}`}>
                    {r.severidade}
                  </span>
                </TableCell>
                <TableCell>{r.autor}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.data}</TableCell>
                <TableCell>
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value as Reporte["status"])}
                    className={`rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold ${stColor[r.status]}`}
                  >
                    <option value="aberto">Aberto</option>
                    <option value="em_analise">Em análise</option>
                    <option value="resolvido">Resolvido</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
            {slice.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Sem reportes por aqui — perebada tá feliz.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
