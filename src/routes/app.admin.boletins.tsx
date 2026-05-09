import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { boletins, boletimDoDia } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/boletins")({
  head: () => ({ meta: [{ title: "Admin — Boletins" }] }),
  component: BoletinsAdmin,
});

function BoletinsAdmin() {
  const [novoOpen, setNovoOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const gerarIA = () => {
    setConteudo(boletimDoDia.conteudo);
    setTitulo(boletimDoDia.titulo);
    toast.success("Boletim gerado pela IA — revise e publique.");
  };

  const publicar = () => {
    toast.success("Boletim publicado pra perebada!");
    setNovoOpen(false);
    setTitulo("");
    setConteudo("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
          <p className="mt-1 text-sm text-muted-foreground">Geração com IA, edição e publicação.</p>
        </div>
        <button onClick={() => setNovoOpen(true)} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-3 w-3" /> Novo boletim
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">Título</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Publicado em</th></tr></thead>
          <tbody>
            {boletins.map((b) => (
              <tr key={b.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-2 text-xs">{b.data}</td>
                <td className="p-2 font-medium">{b.titulo}</td>
                <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "publicado" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{b.status}</span></td>
                <td className="p-2 text-xs text-muted-foreground">{b.publicado_em ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Novo boletim</DialogTitle></DialogHeader>
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
          <div className="flex gap-2">
            <button onClick={() => { toast.info("Salvo como rascunho."); setNovoOpen(false); }} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">Salvar rascunho</button>
            <button onClick={publicar} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Send className="mr-1 inline h-3 w-3" /> Publicar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
