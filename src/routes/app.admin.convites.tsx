import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { useInvites, useCreateInvite, useRevokeInvite, useResendInvite } from "@/lib/queries/invites";
import { useUsuariosAdmin, useToggleAdmin, useToggleAtivo } from "@/lib/queries/profiles";
import { usePerebasCount, useQuotasGlobalCount, usePodeEmitirConvite, useUpdateLimiteCustom, LIMITE_PEREBAS_HARD, LIMITE_QUOTAS_HARD, colorForPct } from "@/lib/queries/limites";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Mail, Copy, Ban, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: invites, isLoading: loadInv } = useInvites();
  const { data: usuarios, isLoading: loadUsr } = useUsuariosAdmin();
  const revoke = useRevokeInvite();
  const resend = useResendInvite();
  const toggleAdmin = useToggleAdmin();
  const toggleAtivo = useToggleAtivo();

  const [novoOpen, setNovoOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [usuarioOpen, setUsuarioOpen] = useState<any | null>(null);
  const [filtroPapel, setFiltroPapel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const { data: perebasCount } = usePerebasCount();
  const { data: quotasGlobal = 0 } = useQuotasGlobalCount();

  const [confirmRevogar, setConfirmRevogar] = useState<any | null>(null);
  const [confirmDesativar, setConfirmDesativar] = useState<any | null>(null);
  const [confirmRemoverAdmin, setConfirmRemoverAdmin] = useState<any | null>(null);

  const convPredicate = useCallback(
    (c: any, q: string) => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (q && !(c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))) return false;
      return true;
    },
    [filtroStatus],
  );
  const usrPredicate = useCallback(
    (u: any, q: string) => {
      if (filtroPapel !== "todos" && u.role !== filtroPapel) return false;
      if (q && !((u.nome ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))) return false;
      return true;
    },
    [filtroPapel],
  );

  const conv = usePaginatedList(invites ?? [], convPredicate, 20);
  const usr = usePaginatedList(usuarios ?? [], usrPredicate, 20);

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/cadastro/${token}`;
    navigator.clipboard?.writeText(link);
    toast.success("Link copiado.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Convites & usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quem entra e quem mexe no bolão.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CounterCard label="Perebas" current={perebasCount?.total ?? 0} max={LIMITE_PEREBAS_HARD} hint={`${perebasCount?.signups ?? 0} cadastrados · ${perebasCount?.convites_pendentes ?? 0} convites pendentes`} />
        <CounterCard label="Quotas" current={quotasGlobal} max={LIMITE_QUOTAS_HARD} hint="Ativas + aguardando aprovação" />
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
            <button onClick={() => setBulkOpen(true)} className="ml-auto flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
              <Upload className="h-3 w-3" /> Importar em lote
            </button>
            <button onClick={() => setNovoOpen(true)} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Plus className="h-3 w-3" /> Novo convite
            </button>
          </div>
          {loadInv ? <Skeleton className="h-48" /> : conv.total === 0 ? (
            <EmptyState title="Sem convites" description="Convide alguém pra perebada." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Enviado</th><th className="p-2 text-left">Expira</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {conv.slice.map((c: any) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-2 font-medium">{c.nome}</td>
                      <td className="p-2 text-xs text-muted-foreground">{c.email}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[c.status] ?? ""}`}>{c.status}</span></td>
                      <td className="p-2 text-xs">{c.enviado_em ? new Date(c.enviado_em).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-2 text-xs">{new Date(c.expira_em).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2 text-right">
                        <button onClick={async () => { await resend.mutateAsync(c.id); toast.success("Convite reenviado."); }} title="Reenviar" className="mr-1 rounded p-1 hover:bg-muted"><Send className="h-3 w-3" /></button>
                        <button onClick={() => copiarLink(c.token)} title="Copiar link" className="mr-1 rounded p-1 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                        <button onClick={() => setConfirmRevogar(c)} title="Revogar" className="rounded p-1 hover:bg-muted"><Ban className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          {loadUsr ? <Skeleton className="h-48" /> : usr.total === 0 ? (
            <EmptyState title="Sem usuários" description="Convide alguém pra entrar." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-left">Papel</th><th className="p-2 text-right">Quotas</th><th className="p-2 text-left">Último acesso</th><th className="p-2 text-left">Ativo</th></tr></thead>
                <tbody>
                  {usr.slice.map((u: any) => (
                    <tr key={u.id} onClick={() => setUsuarioOpen(u)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                      <td className="p-2 font-medium">{u.nome}</td>
                      <td className="p-2 text-xs text-muted-foreground">{u.email}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{u.role}</span></td>
                      <td className="p-2 text-right">
                        <span className="font-bold">{u.quotas_ativas ?? u.quotas_count}</span>
                        {(u.quotas_outras ?? 0) > 0 && (
                          <span className="ml-1 text-[10px] text-muted-foreground">· {u.quotas_outras} outras</span>
                        )}
                      </td>
                      <td className="p-2 text-xs">{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString("pt-BR") : "—"}</td>
                      <td className="p-2 text-xs">{u.ativo ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DataTablePagination total={usr.total} page={usr.page} totalPages={usr.totalPages} pageSize={usr.pageSize} onPageChange={usr.setPage} />
        </TabsContent>
      </Tabs>

      <NovoConviteDialog open={novoOpen} onOpenChange={setNovoOpen} />
      <BulkConviteDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      <Sheet open={!!usuarioOpen} onOpenChange={(v) => !v && setUsuarioOpen(null)}>
        <SheetContent>
          {usuarioOpen && (
            <>
              <SheetHeader><SheetTitle>{usuarioOpen.nome}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-muted-foreground">{usuarioOpen.email}</p>
                <LimiteCustomEditor user={usuarioOpen} onSaved={(novo) => setUsuarioOpen({ ...usuarioOpen, limite_quotas_custom: novo })} />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (usuarioOpen.role === "admin") setConfirmRemoverAdmin(usuarioOpen);
                      else { await toggleAdmin.mutateAsync({ user_id: usuarioOpen.id, makeAdmin: true }); toast.success("Promovido a admin."); setUsuarioOpen(null); }
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
        description={`Revogar o convite de ${confirmRevogar?.nome ?? ""}? O link ficará inválido.`}
        confirmLabel="Revogar"
        destructive
        onConfirm={async () => { if (confirmRevogar) { await revoke.mutateAsync(confirmRevogar.id); toast.info("Convite revogado."); } setConfirmRevogar(null); }}
      />
      <ConfirmDialog
        open={!!confirmRemoverAdmin}
        onOpenChange={(v) => !v && setConfirmRemoverAdmin(null)}
        description={`Remover privilégio de admin de ${confirmRemoverAdmin?.nome ?? ""}?`}
        confirmLabel="Remover admin"
        destructive
        onConfirm={async () => {
          if (confirmRemoverAdmin) { await toggleAdmin.mutateAsync({ user_id: confirmRemoverAdmin.id, makeAdmin: false }); toast.success("Admin removido."); }
          setConfirmRemoverAdmin(null); setUsuarioOpen(null);
        }}
      />
      <ConfirmDialog
        open={!!confirmDesativar}
        onOpenChange={(v) => !v && setConfirmDesativar(null)}
        description={`${confirmDesativar?.ativo ? "Desativar" : "Ativar"} ${confirmDesativar?.nome ?? ""}?`}
        confirmLabel={confirmDesativar?.ativo ? "Desativar" : "Ativar"}
        destructive={!!confirmDesativar?.ativo}
        onConfirm={async () => {
          if (confirmDesativar) { await toggleAtivo.mutateAsync({ user_id: confirmDesativar.id, ativo: !confirmDesativar.ativo }); toast.info(confirmDesativar.ativo ? "Desativado." : "Ativado."); }
          setConfirmDesativar(null); setUsuarioOpen(null);
        }}
      />
    </div>
  );
}

function NovoConviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateInvite();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const parsed = conviteSchema.safeParse({ nome, email, mensagem: mensagem || undefined });
  const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};
  const valido = parsed.success;

  const [submitting, setSubmitting] = useState(false);

  const enviar = async () => {
    if (!valido) return;
    setSubmitting(true);
    try {
      const { invite, emailError } = await create.mutateAsync({ nome: nome.trim(), email: email.trim(), mensagem: mensagem || null });
      if (emailError) {
        const link = `${window.location.origin}/cadastro/${invite.token}`;
        navigator.clipboard?.writeText(link);
        toast.warning(`Convite criado, mas e-mail falhou. Link copiado: ${link}`);
      } else {
        toast.success(`Convite enviado pra ${nome}!`);
      }
      setNome(""); setEmail(""); setMensagem("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar convite.");
    } finally {
      setSubmitting(false);
    }
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
        <button disabled={!valido || submitting} onClick={enviar} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Mail className="mr-1 inline h-3 w-3" /> {submitting ? "Enviando…" : "Enviar"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function CounterCard({ label, current, max, hint }: { label: string; current: number; max: number; hint?: string }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = colorForPct(pct);
  const barColor = pct >= 95 ? "bg-destructive" : pct >= 80 ? "bg-accent" : "bg-success";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`font-display text-2xl font-extrabold ${color}`}>
          {current}<span className="text-sm text-muted-foreground"> / {max}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LimiteCustomEditor({ user, onSaved }: { user: any; onSaved: (novo: number | null) => void }) {
  const update = useUpdateLimiteCustom();
  const { data: quotasGlobal = 0 } = useQuotasGlobalCount();
  const [valor, setValor] = useState<string>(user.limite_quotas_custom?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    const novo = valor.trim() === "" ? null : Number(valor);
    if (novo !== null && (!Number.isInteger(novo) || novo < 0 || novo > LIMITE_QUOTAS_HARD)) {
      toast.error(`Limite inválido. Use 0..${LIMITE_QUOTAS_HARD} ou vazio.`);
      return;
    }
    if (novo !== null) {
      const atual = user.quotas_count ?? 0;
      const delta = novo - (user.limite_quotas_custom ?? 5);
      if (quotasGlobal + Math.max(0, delta) > LIMITE_QUOTAS_HARD) {
        toast.error(`Esse limite estoura o teto global (${LIMITE_QUOTAS_HARD}).`);
        return;
      }
      if (novo < atual) {
        toast.error(`Pereba já tem ${atual} quotas. Limite não pode ser menor.`);
        return;
      }
    }
    setSaving(true);
    try {
      await update.mutateAsync({ user_id: user.id, limite: novo });
      toast.success("Limite atualizado.");
      onSaved(novo);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Limite de quotas</p>
      <p className="mt-1 text-xs text-muted-foreground">Padrão: 5. Vazio = usa o padrão. Máx: {LIMITE_QUOTAS_HARD}.</p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="5"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button onClick={salvar} disabled={saving} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function BulkConviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateInvite();
  const [texto, setTexto] = useState("");
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: number; falhas: { linha: number; motivo: string }[] } | null>(null);

  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const excedeu = linhas.length > 50;

  const processar = async () => {
    setResultado(null);
    setProcessando(true);
    const ok: number[] = [];
    const falhas: { linha: number; motivo: string }[] = [];
    try {
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const partes = linha.split(",").map((p) => p.trim());
        const [nome, email] = partes;
        const parsed = conviteSchema.safeParse({ nome, email });
        if (!parsed.success) {
          falhas.push({ linha: i + 1, motivo: "Formato inválido (use: Nome, email)" });
          continue;
        }
        const { data: pode, error: podeErr } = await (supabase as any).rpc("pode_emitir_convite");
        if (podeErr || !pode?.pode) {
          falhas.push({ linha: i + 1, motivo: pode?.motivo ?? "Limite atingido" });
          continue;
        }
        try {
          await create.mutateAsync({ nome, email, mensagem: null });
          ok.push(i + 1);
        } catch (e: any) {
          falhas.push({ linha: i + 1, motivo: e?.message ?? "Erro" });
        }
      }
      setResultado({ ok: ok.length, falhas });
      if (ok.length > 0) toast.success(`${ok.length} convite(s) enviado(s).`);
      if (falhas.length > 0) toast.warning(`${falhas.length} falha(s).`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setTexto(""); setResultado(null); } }}>
      <DialogContent className="space-y-3">
        <DialogHeader><DialogTitle>Importar convites em lote</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Uma por linha: <code>Nome, email@exemplo.com</code>. Máx 50 por vez.</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={10}
          placeholder={"João Silva, joao@email.com\nMaria, maria@email.com"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={excedeu ? "text-destructive" : "text-muted-foreground"}>{linhas.length} linha(s){excedeu && " — máx 50"}</span>
          <button onClick={processar} disabled={processando || excedeu || linhas.length === 0} className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50">
            <Upload className="mr-1 inline h-3 w-3" /> {processando ? "Processando…" : "Enviar todos"}
          </button>
        </div>
        {resultado && (
          <div className="rounded-lg border border-border p-3 text-xs">
            <p className="font-bold text-success">{resultado.ok} enviado(s) com sucesso.</p>
            {resultado.falhas.length > 0 && (
              <div className="mt-2">
                <p className="font-bold text-destructive">{resultado.falhas.length} falha(s):</p>
                <ul className="mt-1 space-y-0.5">
                  {resultado.falhas.map((f) => <li key={f.linha}>Linha {f.linha}: {f.motivo}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
