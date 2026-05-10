import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { auditoria, type AuditoriaItem } from "@/lib/mock-data";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";

export const Route = createFileRoute("/app/admin/auditoria")({
  head: () => ({ meta: [{ title: "Admin — Auditoria" }] }),
  component: Auditoria,
});

function parseDataBr(s: string): Date {
  const [d, hora] = s.split(" ");
  const [dd, mm, yy] = d.split("/").map(Number);
  const [hh = 0, mi = 0] = (hora ?? "00:00").split(":").map(Number);
  return new Date(yy, (mm ?? 1) - 1, dd ?? 1, hh, mi);
}

function Auditoria() {
  const [filtroAtor, setFiltroAtor] = useState("todos");
  const [filtroAcao, setFiltroAcao] = useState("todas");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const atores = Array.from(new Set(auditoria.map((a) => a.ator)));
  const acoes = Array.from(new Set(auditoria.map((a) => a.acao)));

  const predicate = useCallback(
    (a: AuditoriaItem) => {
      if (filtroAtor !== "todos" && a.ator !== filtroAtor) return false;
      if (filtroAcao !== "todas" && a.acao !== filtroAcao) return false;
      if (dataIni || dataFim) {
        const d = parseDataBr(a.data);
        if (dataIni && d < new Date(dataIni)) return false;
        if (dataFim && d > new Date(dataFim + "T23:59:59")) return false;
      }
      return true;
    },
    [filtroAtor, filtroAcao, dataIni, dataFim],
  );

  const { page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(auditoria, predicate, 25);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Auditoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tudo que rolou no backoffice fica registrado aqui.</p>
        </div>
        <button onClick={() => toast.success("CSV exportado.")} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold">
          <Download className="h-3 w-3" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={filtroAtor} onChange={(e) => setFiltroAtor(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todos">Todos os atores</option>
          {atores.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todas">Todas as ações</option>
          {acoes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">até</span>
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="ml-auto text-xs text-muted-foreground">{total} registro(s) · página {page} de {totalPages}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Data/hora</th><th className="p-2 text-left">Ator</th><th className="p-2 text-left">Ação</th><th className="p-2 text-left">Entidade</th><th className="p-2 text-left">ID</th><th className="p-2 text-left">Payload</th></tr></thead>
          <tbody>
            {slice.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-2 text-xs">{a.data}</td>
                <td className="p-2 font-medium">{a.ator}</td>
                <td className="p-2 text-xs">{a.acao}</td>
                <td className="p-2 text-xs">{a.entidade}</td>
                <td className="p-2 font-mono text-xs">{a.entidade_id}</td>
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
    </div>
  );
}
