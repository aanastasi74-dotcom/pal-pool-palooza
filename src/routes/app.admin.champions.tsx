import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, Send, TestTube2, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  useChampionsTotal,
  useChampionsRespostas,
  useChampionsEnvioStatus,
  useDispararManifestacao,
  useChampionsExternos,
  useCadastrosPendentes,
  useModerarCadastro,
} from "@/lib/queries/champions";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/app/admin/champions")({
  head: () => ({ meta: [{ title: "Admin — Champions 2026/27" }] }),
  component: AdminChampions,
});

function AdminChampions() {
  const { data: total } = useChampionsTotal();
  const { data: respostas, isLoading } = useChampionsRespostas();
  const { data: externos, isLoading: loadingExternos } = useChampionsExternos();
  const { data: pendentes, isLoading: loadingPendentes } = useCadastrosPendentes();
  const { data: envio } = useChampionsEnvioStatus();
  const disparar = useDispararManifestacao();
  const moderar = useModerarCadastro();
  const [confirmRejeitar, setConfirmRejeitar] = useState<null | { id: string; nome: string }>(null);

  const quotasInternas = total?.quotas_total ?? 0;
  const quotasExternas = (externos ?? []).reduce((s, e) => s + (e.quotas ?? 0), 0);
  const quotasCombinadas = quotasInternas + quotasExternas;

  const indicadores = new Map<string, number>();
  for (const e of externos ?? []) {
    const key = (e.indicado_por ?? "").trim();
    if (!key) continue;
    indicadores.set(key, (indicadores.get(key) ?? 0) + 1);
  }
  const rankingIndicadores = Array.from(indicadores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const [confirmEnvio, setConfirmEnvio] = useState(false);
  const [confirmReenvio, setConfirmReenvio] = useState(false);

  const enviarTeste = async () => {
    try {
      await disparar.mutateAsync({ action: "teste" });
      toast.success("Email de teste enviado pro Alessandro.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar teste.");
    }
  };

  const dispararReal = async (force: boolean) => {
    try {
      const data: any = await disparar.mutateAsync({ action: "enviar", force });
      toast.success(`Disparo concluído. ${data?.enviados ?? data?.destinatarios ?? ""} destinatários.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao disparar.");
    }
  };

  const jaEnviado = !!envio?.enviado_em;
  const destinatarios = envio?.destinatarios ?? 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold">
          <Trophy className="h-6 w-6 text-primary" /> Champions 2026/27
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manifestação de interesse — resultados e disparo de email.
        </p>
      </header>

      <section className="rounded-2xl border border-primary/40 bg-primary/5 p-4 shadow-card">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Total combinado (internos + externos)</p>
        <p className="mt-1 font-display text-4xl font-extrabold">
          {quotasCombinadas} <span className="text-base font-medium text-muted-foreground">/ {total?.quorum ?? 35}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Internos: <strong>{quotasInternas}</strong> · Externos: <strong>{quotasExternas}</strong>
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Quotas internos" value={quotasInternas} />
        <StatCard label="Perebas participando" value={total?.perebas ?? 0} />
        <StatCard label="Externos manifestados" value={(externos ?? []).length} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Envio de email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Destinatários elegíveis agora: <strong>{destinatarios}</strong> pereba
          {destinatarios === 1 ? "" : "s"}.
          {jaEnviado && (
            <>
              {" "}Último disparo: <strong>{new Date(envio!.enviado_em!).toLocaleString("pt-BR")}</strong>.
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enviarTeste}
            disabled={disparar.isPending}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-muted disabled:opacity-60"
          >
            <TestTube2 className="h-3.5 w-3.5" />
            Enviar email de TESTE (só pra mim)
          </button>
          <button
            type="button"
            onClick={() => (jaEnviado ? setConfirmReenvio(true) : setConfirmEnvio(true))}
            disabled={disparar.isPending || destinatarios === 0}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {jaEnviado ? "Reenviar pra todos (force)" : "DISPARAR pra todos"}
          </button>
        </div>
        {jaEnviado && (
          <p className="mt-2 flex items-center gap-1 text-xs text-accent">
            <AlertTriangle className="h-3 w-3" />
            Email já foi disparado. Reenvio requer confirmação extra.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-accent/40 bg-accent/5 shadow-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Cadastros pendentes de aprovação</h2>
          <p className="text-xs text-muted-foreground">
            Contas criadas via <code>/champions</code> aguardando aprovação da organização.
          </p>
        </div>
        {loadingPendentes ? (
          <div className="p-4"><Skeleton className="h-40" /></div>
        ) : !pendentes || pendentes.length === 0 ? (
          <EmptyState title="Nenhum cadastro pendente" description="Novos pedidos via /champions caem aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">Apelido</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Indicado por</th>
                  <th className="px-4 py-2 text-right">Quotas</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{p.nome}</td>
                    <td className="px-4 py-2 text-xs">{p.apelido ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{p.indicado_por ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 text-right font-bold">{p.quotas}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={moderar.isPending}
                          onClick={async () => {
                            try {
                              await moderar.mutateAsync({ user_id: p.id, acao: "aprovar" });
                              toast.success(`${p.apelido ?? p.nome} aprovado.`);
                            } catch (e: any) {
                              toast.error(e?.message ?? "Falha ao aprovar.");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" /> Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={moderar.isPending}
                          onClick={() => setConfirmRejeitar({ id: p.id, nome: p.apelido ?? p.nome })}
                          className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-background px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                        >
                          <X className="h-3 w-3" /> Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Respostas</h2>
        </div>
        {isLoading ? (
          <div className="p-4"><Skeleton className="h-40" /></div>
        ) : !respostas || respostas.length === 0 ? (
          <EmptyState title="Ninguém manifestou ainda" description="Assim que os perebas responderem, aparece aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Pereba</th>
                  <th className="px-4 py-2 text-right">Quotas</th>
                  <th className="px-4 py-2 text-right">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((r) => (
                  <tr key={r.user_id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">
                      {r.profiles?.apelido ?? r.profiles?.nome ?? r.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{r.quotas}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {new Date(r.atualizado_em).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Externos (via /champions)</h2>
          <p className="text-xs text-muted-foreground">
            Manifestações feitas na página pública por gente de fora da Perebada.
          </p>
        </div>
        {loadingExternos ? (
          <div className="p-4"><Skeleton className="h-40" /></div>
        ) : !externos || externos.length === 0 ? (
          <EmptyState title="Nenhum externo ainda" description="Compartilha o link /champions no WhatsApp." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Quotas</th>
                  <th className="px-4 py-2 text-left">Indicado por</th>
                  <th className="px-4 py-2 text-right">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {externos.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{e.nome}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{e.email}</td>
                    <td className="px-4 py-2 text-right font-bold">{e.quotas}</td>
                    <td className="px-4 py-2 text-xs">{e.indicado_por ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {new Date(e.criado_em).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rankingIndicadores.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Quem indicou mais</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {rankingIndicadores.map(([nome, n]) => (
              <li key={nome} className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
                <span className="font-medium">{nome}</span>
                <span className="text-xs text-muted-foreground">{n} indicado{n === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmEnvio}
        onOpenChange={setConfirmEnvio}
        title="Disparar email pra todos?"
        description={`Vai enviar o email da Champions pra ${destinatarios} perebas. Essa ação não pode ser desfeita.`}
        confirmLabel="Disparar"
        destructive={false}
        onConfirm={() => {
          setConfirmEnvio(false);
          dispararReal(false);
        }}
      />
      <ConfirmDialog
        open={confirmReenvio}
        onOpenChange={setConfirmReenvio}
        title="Reenviar mesmo já tendo disparado?"
        description={`Email já foi enviado em ${envio?.enviado_em ? new Date(envio.enviado_em).toLocaleString("pt-BR") : "-"}. Confirmar reenvio (force) pra ${destinatarios} perebas.`}
        confirmLabel="Reenviar mesmo assim"
        destructive
        onConfirm={() => {
          setConfirmReenvio(false);
          dispararReal(true);
        }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
