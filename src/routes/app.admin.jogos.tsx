import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { times } from "@/lib/mock-data";
import { useMatches, useCreateMatch, useUpdateMatch, useDeleteMatch } from "@/lib/queries/matches";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/jogos")({
  head: () => ({ meta: [{ title: "Admin — Jogos" }] }),
  component: JogosAdmin,
});

const FASES = ["Fase de grupos", "Round of 32", "Oitavas", "Quartas", "Semifinal", "Disputa de terceiro", "Final"];

type MatchRow = any;

function JogosAdmin() {
  const { data: matches, isLoading } = useMatches();
  const createMatch = useCreateMatch();
  const deleteMatch = useDeleteMatch();

  const [fase, setFase] = useState("todas");
  const [importOpen, setImportOpen] = useState(false);
  const [editar, setEditar] = useState<MatchRow | null>(null);
  const [excluir, setExcluir] = useState<MatchRow | null>(null);

  const todos = matches ?? [];
  const fases = Array.from(new Set(todos.map((j: any) => j.fase)));

  const predicate = useCallback(
    (j: MatchRow, q: string) => {
      if (fase !== "todas" && j.fase !== fase) return false;
      if (!q) return true;
      const casa = times[j.casa]?.nome.toLowerCase() ?? "";
      const fora = times[j.fora]?.nome.toLowerCase() ?? "";
      return j.casa.toLowerCase().includes(q) || j.fora.toLowerCase().includes(q) || casa.includes(q) || fora.includes(q);
    },
    [fase],
  );

  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(todos, predicate, 20);

  const novo = () =>
    setEditar({ id: "", fase: "Fase de grupos", data_jogo: new Date().toISOString(), estadio: "", cidade: "", casa: "BRA", fora: "ARG", peso: 10, status: "agendado", placar_casa: null, placar_fora: null });

  const handleImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(",").map((s) => s.trim()) ?? [];
    let count = 0;
    for (const line of lines) {
      const cols = line.split(",").map((s) => s.trim());
      const row: any = {};
      header.forEach((h, i) => (row[h] = cols[i]));
      try {
        await createMatch.mutateAsync({
          fase: row.fase,
          data_jogo: row.data_jogo,
          estadio: row.estadio || null,
          cidade: row.cidade || null,
          casa: row.casa,
          fora: row.fora,
          peso: Number(row.peso ?? 10),
          status: row.status || "agendado",
        });
        count++;
      } catch (e) { /* skip */ }
    }
    toast.success(`${count} jogo(s) importado(s).`);
    setImportOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão das partidas e fases.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={novo} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold">+ Novo jogo</button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <Upload className="h-3 w-3" /> Importar CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={fase} onChange={(e) => setFase(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todas">Todas as fases</option>
          {fases.map((f: any) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sigla ou seleção…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">{total} jogo(s) · página {page} de {totalPages}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : total === 0 ? (
        <EmptyState title="Sem jogos cadastrados" description="Importe o CSV ou crie um novo jogo." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Fase</th>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Confronto</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Placar</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((j: any) => (
                  <tr key={j.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 text-xs">{j.fase}</td>
                    <td className="p-2 text-xs">{new Date(j.data_jogo).toLocaleString("pt-BR")}</td>
                    <td className="p-2 font-medium">{times[j.casa]?.bandeira} {j.casa} × {j.fora} {times[j.fora]?.bandeira}</td>
                    <td className="p-2 text-xs">{j.status}</td>
                    <td className="p-2 text-right font-display font-bold">
                      {j.placar_casa != null ? `${j.placar_casa} - ${j.placar_fora}` : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={() => setEditar(j)} className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => setExcluir(j)} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar jogos (CSV)</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Cabeçalho: fase,data_jogo,casa,fora,estadio,cidade,peso,status</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} className="text-xs" />
        </DialogContent>
      </Dialog>

      {editar && <EditarJogoDialog jogo={editar} onClose={() => setEditar(null)} />}

      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir jogo?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => { if (excluir) { await deleteMatch.mutateAsync(excluir.id); toast.success("Jogo removido."); } setExcluir(null); }}
      />
    </div>
  );
}

function EditarJogoDialog({ jogo, onClose }: { jogo: MatchRow; onClose: () => void }) {
  const [j, setJ] = useState<any>({ ...jogo, data_local: new Date(jogo.data_jogo ?? Date.now()).toISOString().slice(0, 16) });
  const create = useCreateMatch();
  const update = useUpdateMatch();
  const sigs = Object.keys(times);
  const isNovo = !jogo.id;

  const salvar = async () => {
    const payload = {
      fase: j.fase,
      data_jogo: new Date(j.data_local).toISOString(),
      estadio: j.estadio || null,
      cidade: j.cidade || null,
      casa: j.casa,
      fora: j.fora,
      peso: Number(j.peso ?? 10),
      status: j.status,
      placar_casa: j.placar_casa === "" || j.placar_casa == null ? null : Number(j.placar_casa),
      placar_fora: j.placar_fora === "" || j.placar_fora == null ? null : Number(j.placar_fora),
    };
    if (isNovo) await create.mutateAsync(payload);
    else await update.mutateAsync({ id: jogo.id, ...payload });
    toast.success("Jogo salvo.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg space-y-3">
        <DialogHeader><DialogTitle>{isNovo ? "Novo jogo" : "Editar jogo"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Fase">
            <select value={j.fase} onChange={(e) => setJ({ ...j, fase: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              {FASES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Data/hora">
            <input type="datetime-local" value={j.data_local} onChange={(e) => setJ({ ...j, data_local: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Estádio">
            <input value={j.estadio ?? ""} onChange={(e) => setJ({ ...j, estadio: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Cidade">
            <input value={j.cidade ?? ""} onChange={(e) => setJ({ ...j, cidade: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Casa">
            <select value={j.casa} onChange={(e) => setJ({ ...j, casa: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              {sigs.map((s) => <option key={s} value={s}>{times[s].nome}</option>)}
            </select>
          </Field>
          <Field label="Fora">
            <select value={j.fora} onChange={(e) => setJ({ ...j, fora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              {sigs.map((s) => <option key={s} value={s}>{times[s].nome}</option>)}
            </select>
          </Field>
          <Field label="Peso">
            <input type="number" value={j.peso ?? 10} onChange={(e) => setJ({ ...j, peso: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Status">
            <select value={j.status} onChange={(e) => setJ({ ...j, status: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              <option value="agendado">Agendado</option>
              <option value="ao-vivo">Ao vivo</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
          <Field label="Placar casa">
            <input type="number" value={j.placar_casa ?? ""} onChange={(e) => setJ({ ...j, placar_casa: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Placar visitante">
            <input type="number" value={j.placar_fora ?? ""} onChange={(e) => setJ({ ...j, placar_fora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">Cancelar</button>
          <button onClick={salvar} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Salvar</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}
