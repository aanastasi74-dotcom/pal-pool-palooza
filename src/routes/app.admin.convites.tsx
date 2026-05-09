import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { convites, usuariosAdmin, type Convite, type UsuarioAdmin } from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Mail, Copy, Ban, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/convites")({
  head: () => ({ meta: [{ title: "Admin — Convites & Usuários" }] }),
  component: ConvitesUsuarios,
});

const statusColor: Record<string, string> = {
  pendente: "bg-accent/15 text-accent",
  usado: "bg-success/15 text-success",
  expirado: "bg-muted text-muted-foreground",
  revogado: "bg-destructive/15 text-destructive",
};

function ConvitesUsuarios() {
  const [novoOpen, setNovoOpen] = useState(false);
  const [usuarioOpen, setUsuarioOpen] = useState<UsuarioAdmin | null>(null);
  const [filtroPapel, setFiltroPapel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const convFiltrados = convites.filter((c) => filtroStatus === "todos" || c.status === filtroStatus);
  const usrFiltrados = usuariosAdmin.filter((u) => filtroPapel === "todos" || u.role === filtroPapel);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Convites & usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quem entra e quem mexe no bolão.</p>
      </div>

      <Tabs defaultValue="convites">
        <TabsList>
          <TabsTrigger value="convites">Convites</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="convites" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="usado">Usados</option>
              <option value="expirado">Expirados</option>
              <option value="revogado">Revogados</option>
            </select>
            <button onClick={() => setNovoOpen(true)} className="ml-auto flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Plus className="h-3 w-3" /> Novo convite
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Enviado</th><th className="p-2 text-left">Expira</th><th className="p-2"></th></tr></thead>
              <tbody>
                {convFiltrados.map((c: Convite) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-2 font-medium">{c.nome}</td>
                    <td className="p-2 text-xs text-muted-foreground">{c.email}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[c.status]}`}>{c.status}</span></td>
                    <td className="p-2 text-xs">{c.enviado_em}</td>
                    <td className="p-2 text-xs">{c.expira_em}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => toast.success("Convite reenviado.")} title="Reenviar" className="mr-1 rounded p-1 hover:bg-muted"><Send className="h-3 w-3" /></button>
                      <button onClick={() => { navigator.clipboard?.writeText(`https://perebas.com/convite/${c.id}`); toast.success("Link copiado."); }} title="Copiar link" className="mr-1 rounded p-1 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                      <button onClick={() => toast.info("Convite revogado.")} title="Revogar" className="rounded p-1 hover:bg-muted"><Ban className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-3">
          <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
            <option value="todos">Todos</option>
            <option value="admin">Admins</option>
            <option value="participante">Participantes</option>
          </select>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Papel</th><th className="p-2 text-right">Quotas</th><th className="p-2 text-left">Último acesso</th><th className="p-2 text-left">Ativo</th></tr></thead>
              <tbody>
                {usrFiltrados.map((u) => (
                  <tr key={u.id} onClick={() => setUsuarioOpen(u)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                    <td className="p-2 font-medium">{u.nome}</td>
                    <td className="p-2 text-xs text-muted-foreground">{u.email}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{u.role}</span></td>
                    <td className="p-2 text-right font-bold">{u.quotas_count}</td>
                    <td className="p-2 text-xs">{u.ultimo_acesso ?? "—"}</td>
                    <td className="p-2 text-xs">{u.ativo ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo convite</DialogTitle></DialogHeader>
          <input placeholder="Nome" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input placeholder="E-mail" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Mensagem (opcional)" rows={3} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={() => { toast.success("Convite enviado."); setNovoOpen(false); }} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
            <Mail className="mr-1 inline h-3 w-3" /> Enviar
          </button>
        </DialogContent>
      </Dialog>

      <Sheet open={!!usuarioOpen} onOpenChange={(v) => !v && setUsuarioOpen(null)}>
        <SheetContent>
          {usuarioOpen && (
            <>
              <SheetHeader><SheetTitle>{usuarioOpen.nome}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-muted-foreground">{usuarioOpen.email}</p>
                <div className="flex gap-2">
                  <button onClick={() => { toast.success(usuarioOpen.role === "admin" ? "Admin removido." : "Promovido a admin."); setUsuarioOpen(null); }} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                    {usuarioOpen.role === "admin" ? "Remover admin" : "Tornar admin"}
                  </button>
                  <button onClick={() => { toast.info(usuarioOpen.ativo ? "Desativado." : "Ativado."); setUsuarioOpen(null); }} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
                    {usuarioOpen.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
