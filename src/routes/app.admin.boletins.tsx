import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { boletins, gerarBoletimMock, type Boletim } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Sparkles, Send, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/app/admin/boletins")({
  head: () => ({ meta: [{ title: "Admin — Boletins" }] }),
  component: BoletinsAdmin,
});

const statusColor: Record<Boletim["status"], string> = {
  publicado: "bg-success/15 text-success",
  rascunho: "bg-muted text-muted-foreground",
  agendado: "bg-accent/15 text-accent",
};

function BoletinsAdmin() {
  const [editando, setEditando] = useState<Boletim | null>(null);
  const [excluir, setExcluir] = useState<Boletim | null>(null);

  const novo = () =>
    setEditando({ id: "", data: new Date().toLocaleDateString("pt-BR"), titulo: "", conteudo: "", status: "rascunho" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
          <p className="mt-1 text-sm text-muted-foreground">Geração com IA, edição e publicação.</p>
        </div>
        <button onClick={novo} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-3 w-3" /> Novo boletim
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">Título</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Publicado em</th><th className="p-2"></th></tr></thead>
          <tbody>
            {boletins.map((b) => (
              <tr key={b.id} onClick={() => setEditando(b)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                <td className="p-2 text-xs">{b.data}</td>
                <td className="p-2 font-medium">{b.titulo}</td>
                <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[b.status]}`}>{b.status}</span></td>
                <td className="p-2 text-xs text-muted-foreground">{b.publicado_em ?? b.agendado_para ?? "—"}</td>
                <td className="p-2 text-right">
                  <button onClick={(e) => { e.stopPropagation(); setEditando(b); }} className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setExcluir(b); }} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3 w-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && <BoletimDialog key={editando.id || "novo"} boletim={editando} onClose={() => setEditando(null)} />}

      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        title="Excluir boletim?"
        description={`O boletim "${excluir?.titulo}" será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => { toast.success("Boletim excluído."); setExcluir(null); }}
      />
    </div>
  );
}

function BoletimDialog({ boletim, onClose }: { boletim: Boletim; onClose: () => void }) {
  const [titulo, setTitulo] = useState(boletim.titulo);
  const [conteudo, setConteudo] = useState(boletim.conteudo);
  const isNovo = !boletim.id;

  const gerarIA = () => {
    const g = gerarBoletimMock();
    setTitulo(g.titulo);
    setConteudo(g.conteudo);
    toast.success("Boletim gerado pela IA — revise e publique.");
  };

  const publicar = () => {
    toast.success("Boletim publicado pra perebada!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{isNovo ? "Novo boletim" : "Editar boletim"}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2">
          <button onClick={gerarIA} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Gerar com IA
          </button>
        </div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-display font-bold" />
        <Tabs defaultValue="editar">
          <TabsList>
            <TabsTrigger value="editar">Editar</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
          </TabsList>
          <TabsContent value="editar">
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={10} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </TabsContent>
          <TabsContent value="preview">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-display text-lg font-bold">{titulo || "Sem título"}</h3>
              <p className="mt-2 whitespace-pre-line text-sm">{conteudo || "Sem conteúdo ainda."}</p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { toast.info("Salvo como rascunho."); onClose(); }} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">Salvar rascunho</button>
          <button onClick={() => { toast.success("Boletim agendado."); onClose(); }} className="flex-1 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-bold text-accent">Agendar</button>
          <button onClick={publicar} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <Send className="mr-1 inline h-3 w-3" /> Publicar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
