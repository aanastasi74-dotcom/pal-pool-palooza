import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { jogos, jogosAdminExtra, times, auditoria, type Jogo } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Pencil, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/app/admin/jogos")({
  head: () => ({ meta: [{ title: "Admin — Jogos" }] }),
  component: JogosAdmin,
});

function JogosAdmin() {
  const todos = useMemo(() => [...jogos, ...jogosAdminExtra], []);
  const [fase, setFase] = useState("todas");
  const [importOpen, setImportOpen] = useState(false);
  const [eliminOpen, setEliminOpen] = useState(false);
  const [editar, setEditar] = useState<Jogo | null>(null);
  const [excluir, setExcluir] = useState<Jogo | null>(null);

  const fases = Array.from(new Set(todos.map((j) => j.fase)));

  const predicate = useCallback(
    (j: Jogo, q: string) => {
      if (fase !== "todas" && j.fase !== fase) return false;
      if (!q) return true;
      const casa = times[j.casa]?.nome.toLowerCase() ?? "";
      const fora = times[j.fora]?.nome.toLowerCase() ?? "";
      return j.casa.toLowerCase().includes(q) || j.fora.toLowerCase().includes(q) || casa.includes(q) || fora.includes(q);
    },
    [fase],
  );

  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(todos, predicate, 20);

  const todosGruposEncerrados = todos.filter((j) => j.fase === "Fase de grupos").every((j) => j.status === "encerrado");

  const confirmarExclusao = () => {
    if (!excluir) return;
    auditoria.unshift({
      id: `a${Date.now()}`,
      ator: "Você",
      acao: "excluiu_jogo",
      entidade: "jogo",
      entidade_id: excluir.id,
      data: new Date().toLocaleString("pt-BR"),
    });
    toast.success("Jogo removido.");
    setExcluir(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão das partidas e fases.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <Upload className="h-3 w-3" /> Importar CSV/Excel
          </button>
          <button
            disabled={!todosGruposEncerrados}
            onClick={() => setEliminOpen(true)}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Trophy className="h-3 w-3" /> Gerar fases eliminatórias
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={fase} onChange={(e) => setFase(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todas">Todas as fases</option>
          {fases.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sigla ou seleção…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">{total} jogo(s) · página {page} de {totalPages}</span>
      </div>

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
            {slice.map((j) => (
              <tr key={j.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-2 text-xs">{j.fase}</td>
                <td className="p-2 text-xs">{j.data} {j.hora}</td>
                <td className="p-2 font-medium">{times[j.casa]?.bandeira} {j.casa} × {j.fora} {times[j.fora]?.bandeira}</td>
                <td className="p-2 text-xs">{j.status}</td>
                <td className="p-2 text-right font-display font-bold">
                  {j.placarCasa !== undefined ? `${j.placarCasa} - ${j.placarFora}` : "—"}
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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar jogos (CSV/Excel)</DialogTitle></DialogHeader>
          <a className="text-xs text-primary underline" href="#" onClick={(e) => { e.preventDefault(); toast.info("Modelo baixado (mock)"); }}>Baixar modelo</a>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm">Arraste a planilha aqui</p>
          </div>
          <p className="text-xs font-bold">Pré-visualização (5 primeiras linhas)</p>
          <div className="rounded-lg border border-border text-xs">
            {jogosAdminExtra.slice(0, 5).map((j) => (
              <div key={j.id} className="grid grid-cols-4 gap-2 border-b border-border p-2 last:border-0">
                <span>{j.fase}</span><span>{j.data}</span><span>{j.casa} × {j.fora}</span><span>{j.estadio}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { toast.success("Jogos importados."); setImportOpen(false); }} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Confirmar importação</button>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminOpen} onOpenChange={setEliminOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar fases eliminatórias</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Pré-visualização de quem avança da fase de grupos:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {["BRA", "ARG", "FRA", "ESP", "ALE", "ING", "POR", "HOL"].map((t) => (
              <div key={t} className="rounded-lg border border-border bg-card p-2">{times[t]?.bandeira} {times[t]?.nome}</div>
            ))}
          </div>
          <button onClick={() => { toast.success("Eliminatórias geradas."); setEliminOpen(false); }} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Confirmar</button>
        </DialogContent>
      </Dialog>

      {editar && <EditarJogoDialog jogo={editar} onClose={() => setEditar(null)} />}

      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir jogo?"
        description="Esta ação não pode ser desfeita. O jogo e os palpites associados serão removidos."
        confirmLabel="Excluir"
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

function EditarJogoDialog({ jogo, onClose }: { jogo: Jogo; onClose: () => void }) {
  const [j, setJ] = useState(jogo);
  const sigs = Object.keys(times);

  const salvar = () => {
    auditoria.unshift({
      id: `a${Date.now()}`,
      ator: "Você",
      acao: "atualizou_jogo",
      entidade: "jogo",
      entidade_id: j.id,
      payload: { casa: j.casa, fora: j.fora, status: j.status },
      data: new Date().toLocaleString("pt-BR"),
    });
    toast.success("Jogo atualizado.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg space-y-3">
        <DialogHeader><DialogTitle>Editar jogo</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Data">
            <input value={j.data} onChange={(e) => setJ({ ...j, data: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Hora">
            <input value={j.hora} onChange={(e) => setJ({ ...j, hora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Estádio">
            <input value={j.estadio} onChange={(e) => setJ({ ...j, estadio: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Cidade">
            <input value={j.cidade} onChange={(e) => setJ({ ...j, cidade: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
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
            <input type="number" value={j.peso} onChange={(e) => setJ({ ...j, peso: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Status">
            <select value={j.status} onChange={(e) => setJ({ ...j, status: e.target.value as Jogo["status"] })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              <option value="agendado">Agendado</option>
              <option value="ao-vivo">Ao vivo</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
          <Field label="Placar casa">
            <input type="number" value={j.placarCasa ?? ""} onChange={(e) => setJ({ ...j, placarCasa: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Placar visitante">
            <input type="number" value={j.placarFora ?? ""} onChange={(e) => setJ({ ...j, placarFora: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
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
