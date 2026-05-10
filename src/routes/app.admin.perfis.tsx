import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { usePersonalityProfiles, useCreatePersonalityProfile, useUpdatePersonalityProfile, useDeletePersonalityProfile } from "@/lib/queries/personality";
import { useUsuariosAdmin } from "@/lib/queries/profiles";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/perfis")({
  head: () => ({ meta: [{ title: "Admin — Perfis" }] }),
  component: PerfisAdmin,
});

type PerfilRow = any;

function PerfisAdmin() {
  const { data, isLoading } = usePersonalityProfiles();
  const [aberto, setAberto] = useState<PerfilRow | null>(null);

  const predicate = useCallback((p: any, q: string) => {
    if (!q) return true;
    if ((p.apelido_principal ?? "").toLowerCase().includes(q)) return true;
    return (p.apelidos_alternativos ?? []).some((a: string) => a.toLowerCase().includes(q));
  }, []);

  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(data ?? [], predicate, 20);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Perfis de personalidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">A alma da zoeira da perebada.</p>
        </div>
        <button onClick={() => setAberto({ id: "", participante_id: null, apelido_principal: "", apelidos_alternativos: [], tracos: [], tags: [], observacoes_admin: "" })} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-3 w-3" /> Novo perfil
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar apelido…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">{total} perfil(is)</span>
      </div>

      {isLoading ? <Skeleton className="h-48" /> : total === 0 ? (
        <EmptyState title="Sem perfis cadastrados" description="Crie um perfil pra dar tempero aos boletins." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Apelido</th><th className="p-2 text-right">Traços</th><th className="p-2 text-right">Tags</th><th className="p-2 text-left">Observações</th></tr></thead>
              <tbody>
                {slice.map((p: any) => (
                  <tr key={p.id} onClick={() => setAberto(p)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                    <td className="p-2 font-display font-bold">{p.apelido_principal}</td>
                    <td className="p-2 text-right">{(p.tracos ?? []).length}</td>
                    <td className="p-2 text-right">{(p.tags ?? []).length}</td>
                    <td className="p-2 truncate text-xs text-muted-foreground">{p.observacoes_admin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      <Sheet open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <SheetContent className="w-[480px] overflow-y-auto sm:max-w-lg">
          {aberto && <PerfilForm key={aberto.id || "novo"} perfil={aberto} onClose={() => setAberto(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PerfilForm({ perfil, onClose }: { perfil: PerfilRow; onClose: () => void }) {
  const { data: usuarios } = useUsuariosAdmin();
  const create = useCreatePersonalityProfile();
  const update = useUpdatePersonalityProfile();
  const del = useDeletePersonalityProfile();

  const [p, setP] = useState<any>({ ...perfil, apelidos_alternativos: perfil.apelidos_alternativos ?? [], tracos: perfil.tracos ?? [], tags: perfil.tags ?? [] });
  const [novoApelido, setNovoApelido] = useState("");
  const [novaTag, setNovaTag] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const isNovo = !perfil.id;

  const salvar = async () => {
    if (!p.apelido_principal.trim()) { toast.error("Apelido principal é obrigatório."); return; }
    const payload = {
      participante_id: p.participante_id || null,
      apelido_principal: p.apelido_principal.trim(),
      apelidos_alternativos: p.apelidos_alternativos,
      tracos: p.tracos,
      tags: p.tags,
      observacoes_admin: p.observacoes_admin ?? "",
    };
    if (isNovo) await create.mutateAsync(payload);
    else await update.mutateAsync({ id: perfil.id, ...payload });
    toast.success("Perfil salvo.");
    onClose();
  };

  const excluir = async () => {
    await del.mutateAsync(perfil.id);
    toast.success("Perfil excluído.");
    setConfirmDel(false);
    onClose();
  };

  return (
    <>
      <SheetHeader><SheetTitle>{p.apelido_principal || "Novo perfil"}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-4 text-sm">
        <div>
          <label className="text-xs font-bold">Participante vinculado</label>
          <select
            value={p.participante_id ?? ""}
            onChange={(e) => setP({ ...p, participante_id: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Sem vínculo</option>
            {(usuarios ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold">Apelido principal *</label>
          <input value={p.apelido_principal} onChange={(e) => setP({ ...p, apelido_principal: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-bold">Apelidos alternativos</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.apelidos_alternativos.map((a: string) => (
              <span key={a} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">
                {a}
                <button onClick={() => setP({ ...p, apelidos_alternativos: p.apelidos_alternativos.filter((x: string) => x !== a) })}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            <input value={novoApelido} onChange={(e) => setNovoApelido(e.target.value)} placeholder="Adicionar..." className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
            <button onClick={() => { if (novoApelido) { setP({ ...p, apelidos_alternativos: [...p.apelidos_alternativos, novoApelido] }); setNovoApelido(""); } }} className="rounded bg-primary px-2 text-xs font-bold text-primary-foreground">+</button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">Traços</label>
          <div className="mt-1 space-y-2">
            {p.tracos.map((t: any, i: number) => (
              <div key={i} className="flex gap-1">
                <input value={t.traco} onChange={(e) => setP({ ...p, tracos: p.tracos.map((x: any, j: number) => j === i ? { ...x, traco: e.target.value } : x) })} placeholder="Traço" className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                <input value={t.brincadeira} onChange={(e) => setP({ ...p, tracos: p.tracos.map((x: any, j: number) => j === i ? { ...x, brincadeira: e.target.value } : x) })} placeholder="Brincadeira" className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                <button onClick={() => setP({ ...p, tracos: p.tracos.filter((_: any, j: number) => j !== i) })} className="rounded bg-destructive px-2 text-xs text-destructive-foreground">×</button>
              </div>
            ))}
            <button onClick={() => setP({ ...p, tracos: [...p.tracos, { traco: "", brincadeira: "" }] })} className="text-xs text-primary">+ Adicionar traço</button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">Tags</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.tags.map((t: string) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs">
                {t}
                <button onClick={() => setP({ ...p, tags: p.tags.filter((x: string) => x !== t) })}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} placeholder="Adicionar tag..." className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
            <button onClick={() => { if (novaTag) { setP({ ...p, tags: [...p.tags, novaTag] }); setNovaTag(""); } }} className="rounded bg-primary px-2 text-xs font-bold text-primary-foreground">+</button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">Observações para o admin</label>
          <textarea value={p.observacoes_admin ?? ""} onChange={(e) => setP({ ...p, observacoes_admin: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <button onClick={salvar} className="w-full rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Salvar perfil</button>
        {!isNovo && (
          <button onClick={() => setConfirmDel(true)} className="flex w-full items-center justify-center gap-1 rounded-full border border-destructive/40 px-5 py-2 text-xs font-bold text-destructive">
            <Trash2 className="h-3 w-3" /> Excluir perfil
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        description={`Excluir o perfil "${p.apelido_principal}"?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={excluir}
      />
    </>
  );
}
