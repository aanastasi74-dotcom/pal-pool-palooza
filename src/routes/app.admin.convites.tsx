import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { convites, usuariosAdmin, type Convite, type UsuarioAdmin } from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Mail, Copy, Ban, Send } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";

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

const conviteSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres."),
  email: z.string().trim().email("E-mail inválido."),
  mensagem: z.string().max(200, "Mensagem deve ter no máximo 200 caracteres.").optional(),
});

function ConvitesUsuarios() {
  const [novoOpen, setNovoOpen] = useState(false);
  const [usuarioOpen, setUsuarioOpen] = useState<UsuarioAdmin | null>(null);
  const [filtroPapel, setFiltroPapel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [confirmRevogar, setConfirmRevogar] = useState<Convite | null>(null);
  const [confirmDesativar, setConfirmDesativar] = useState<UsuarioAdmin | null>(null);
  const [confirmRemoverAdmin, setConfirmRemoverAdmin] = useState<UsuarioAdmin | null>(null);

  const convPredicate = useCallback(
    (c: Convite, q: string) => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (q && !(c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))) return false;
      return true;
    },
    [filtroStatus],
  );
  const usrPredicate = useCallback(
    (u: UsuarioAdmin, q: string) => {
      if (filtroPapel !== "todos" && u.role !== filtroPapel) return false;
      if (q && !(u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
      return true;
    },
    [filtroPapel],
  );

  const conv = usePaginatedList(convites, convPredicate, 20);
  const usr = usePaginatedList(usuariosAdmin, usrPredicate, 20);

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
            <input value={conv.query} onChange={(e) => conv.setQuery(e.target.value)} placeholder="Buscar nome ou e-mail…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
            <span className="text-xs text-muted-foreground">{conv.total} convite(s)</span>
            <button onClick={() => setNovoOpen(true)} className="ml-auto flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Plus className="h-3 w-3" /> Novo convite
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Enviado</th><th className="p-2 text-left">Expira</th><th className="p-2"></th></tr></thead>
              <tbody>
                {conv.slice.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-2 font-medium">{c.nome}</td>
                    <td className="p-2 text-xs text-muted-foreground">{c.email}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[c.status]}`}>{c.status}</span></td>
                    <td className="p-2 text-xs">{c.enviado_em}</td>
                    <td className="p-2 text-xs">{c.expira_em}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => toast.success("Convite reenviado.")} title="Reenviar" className="mr-1 rounded p-1 hover:bg-muted"><Send className="h-3 w-3" /></button>
                      <button onClick={() => { navigator.clipboard?.writeText(`https://perebas.com/convite/${c.id}`); toast.success("Link copiado."); }} title="Copiar link" className="mr-1 rounded p-1 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                      <button onClick={() => setConfirmRevogar(c)} title="Revogar" className="rounded p-1 hover:bg-muted"><Ban className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={conv.total} page={conv.page} totalPages={conv.totalPages} pageSize={conv.pageSize} onPageChange={conv.setPage} />
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
              <option value="todos">Todos</option>
              <option value="admin">Admins</option>
              <option value="participante">Participantes</option>
            </select>
            <input value={usr.query} onChange={(e) => usr.setQuery(e.target.value)} placeholder="Buscar nome ou e-mail…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
            <span className="text-xs text-muted-foreground">{usr.total} usuário(s)</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Papel</th><th className="p-2 text-right">Quotas</th><th className="p-2 text-left">Último acesso</th><th className="p-2 text-left">Ativo</th></tr></thead>
              <tbody>
                {usr.slice.map((u) => (
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
          <DataTablePagination total={usr.total} page={usr.page} totalPages={usr.totalPages} pageSize={usr.pageSize} onPageChange={usr.setPage} />
        </TabsContent>
      </Tabs>

      <NovoConviteDialog open={novoOpen} onOpenChange={setNovoOpen} />

      <Sheet open={!!usuarioOpen} onOpenChange={(v) => !v && setUsuarioOpen(null)}>
        <SheetContent>
          {usuarioOpen && (
            <>
              <SheetHeader><SheetTitle>{usuarioOpen.nome}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-muted-foreground">{usuarioOpen.email}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (usuarioOpen.role === "admin") setConfirmRemoverAdmin(usuarioOpen);
                      else { toast.success("Promovido a admin."); setUsuarioOpen(null); }
                    }}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  >
                    {usuarioOpen.role === "admin" ? "Remover admin" : "Tornar admin"}
                  </button>
                  <button onClick={() => setConfirmDesativar(usuarioOpen)} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
                    {usuarioOpen.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmRevogar}
        onOpenChange={(v) => !v && setConfirmRevogar(null)}
        description={`Revogar o convite de ${confirmRevogar?.nome ?? ""}? O link ficará inválido e o convidado não conseguirá entrar.`}
        confirmLabel="Revogar"
        onConfirm={() => { toast.info("Convite revogado."); setConfirmRevogar(null); }}
      />
      <ConfirmDialog
        open={!!confirmRemoverAdmin}
        onOpenChange={(v) => !v && setConfirmRemoverAdmin(null)}
        description={`Remover o privilégio de admin de ${confirmRemoverAdmin?.nome ?? ""}? Ele perderá acesso ao backoffice.`}
        confirmLabel="Remover admin"
        onConfirm={() => { toast.success("Admin removido."); setConfirmRemoverAdmin(null); setUsuarioOpen(null); }}
      />
      <ConfirmDialog
        open={!!confirmDesativar}
        onOpenChange={(v) => !v && setConfirmDesativar(null)}
        description={`${confirmDesativar?.ativo ? "Desativar" : "Ativar"} ${confirmDesativar?.nome ?? ""}? ${confirmDesativar?.ativo ? "O usuário não conseguirá mais acessar o app." : "O usuário poderá voltar a acessar."}`}
        confirmLabel={confirmDesativar?.ativo ? "Desativar" : "Ativar"}
        destructive={!!confirmDesativar?.ativo}
        onConfirm={() => { toast.info(confirmDesativar?.ativo ? "Desativado." : "Ativado."); setConfirmDesativar(null); setUsuarioOpen(null); }}
      />
    </div>
  );
}

function NovoConviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const parsed = conviteSchema.safeParse({ nome, email, mensagem: mensagem || undefined });
  const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};
  const valido = parsed.success;

  const enviar = () => {
    if (!valido) return;
    toast.success("Convite enviado.");
    setNome(""); setEmail(""); setMensagem("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setNome(""); setEmail(""); setMensagem(""); } }}>
      <DialogContent className="space-y-3">
        <DialogHeader><DialogTitle>Novo convite</DialogTitle></DialogHeader>
        <div>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          {errors.nome && <p className="mt-1 text-xs text-destructive">{errors.nome[0]}</p>}
        </div>
        <div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email[0]}</p>}
        </div>
        <div>
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem (opcional, máx 200)" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          {errors.mensagem && <p className="mt-1 text-xs text-destructive">{errors.mensagem[0]}</p>}
        </div>
        <button disabled={!valido} onClick={enviar} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Mail className="mr-1 inline h-3 w-3" /> Enviar
        </button>
      </DialogContent>
    </Dialog>
  );
}
