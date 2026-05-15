import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Wrench, XCircle, AlertTriangle } from "lucide-react";
import {
  useAdminQuotasList,
  useAtivarQuotaManual,
  useEncerrarQuotaManual,
} from "@/lib/queries/lotes";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { translatePgError } from "@/lib/error-messages";

export const Route = createFileRoute("/app/admin/quotas")({
  head: () => ({ meta: [{ title: "Admin — Quotas (recuperação)" }] }),
  component: AdminQuotasPage,
});

const STATUS_OPTS = [
  { v: "", label: "Todas" },
  { v: "incompleta", label: "Incompletas" },
  { v: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { v: "ativa", label: "Ativas" },
  { v: "rejeitada", label: "Rejeitadas" },
  { v: "encerrada", label: "Encerradas" },
];

const RECUPERAVEIS = new Set(["incompleta", "aguardando_aprovacao", "rejeitada"]);

const stColor: Record<string, string> = {
  incompleta: "bg-muted text-muted-foreground",
  aguardando_aprovacao: "bg-accent/30 text-accent-foreground",
  ativa: "bg-success/15 text-success",
  rejeitada: "bg-destructive/15 text-destructive",
  encerrada: "bg-muted text-muted-foreground line-through",
};

const SUGESTOES_ENCERRAR = [
  "Pereba desistiu sem pagar",
  "Quota duplicada",
  "Teste de demonstração",
  "Erro de criação",
];

function AdminQuotasPage() {
  const [status, setStatus] = useState<string>("incompleta");
  const { data: rows = [], isLoading } = useAdminQuotasList({ status: status || undefined });
  // Conta total de quotas em recuperação (independente do filtro selecionado)
  const { data: allRecuperaveis = [] } = useAdminQuotasList({});
  const totalRecuperacao = useMemo(
    () => (allRecuperaveis as any[]).filter((q) => RECUPERAVEIS.has(q.status)).length,
    [allRecuperaveis],
  );

  const ativar = useAtivarQuotaManual();
  const encerrar = useEncerrarQuotaManual();

  const [target, setTarget] = useState<any | null>(null);
  const [motivo, setMotivo] = useState("");
  const [encerrarTarget, setEncerrarTarget] = useState<any | null>(null);
  const [motivoEncerrar, setMotivoEncerrar] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-extrabold">Quotas — recuperação manual</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Use quando o fluxo automático falhar. Ativação manual atribui número, marca payment como aprovado
        e ativa a quota. Encerramento marca como morta sem strike. Tudo fica no audit log.
      </p>

      <div
        className={`rounded-2xl border p-3 shadow-card ${
          totalRecuperacao > 0
            ? "border-destructive/40 bg-destructive/10"
            : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`h-4 w-4 ${totalRecuperacao > 0 ? "text-destructive" : "text-muted-foreground"}`}
          />
          <p className="text-sm font-bold">
            {totalRecuperacao} quota(s) em recuperação
          </p>
          <span className="text-xs text-muted-foreground">
            (incompletas + aguardando + rejeitadas)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Status:
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.v} value={o.v}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{rows.length} resultado(s)</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhuma quota nesse filtro.
        </p>
      ) : (
        <div className="grid gap-2">
          {rows.map((q: any) => {
            const isAtiva = q.status === "ativa";
            const isEncerrada = q.status === "encerrada";
            const podeEncerrar = RECUPERAVEIS.has(q.status);
            return (
              <article
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {q.profile?.nome ?? "—"}
                    {q.profile?.apelido && (
                      <span className="ml-1 text-xs text-muted-foreground">({q.profile.apelido})</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Quota {q.numero ? `#${q.numero}` : "(sem número)"} · lote {q.lote_id?.slice(0, 8) ?? "—"} ·{" "}
                    {new Date(q.created_at).toLocaleString("pt-BR")}
                  </p>
                  {q.motivo_rejeicao && (
                    <p className="text-[11px] text-destructive">Motivo: {q.motivo_rejeicao}</p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stColor[q.status] ?? "bg-muted"}`}>
                  {q.status}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={isAtiva || isEncerrada}
                    onClick={() => { setTarget(q); setMotivo(""); }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
                  >
                    <Wrench className="h-3 w-3" /> Ativar
                  </button>
                  {podeEncerrar && (
                    <button
                      onClick={() => { setEncerrarTarget(q); setMotivoEncerrar(""); }}
                      className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground"
                    >
                      <XCircle className="h-3 w-3" /> Encerrar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        onOpenChange={(v) => { if (!v) { setTarget(null); setMotivo(""); } }}
        title="Ativar quota manualmente"
        description={
          (
            <div className="space-y-2 text-sm">
              <p>
                Pereba: <b>{target?.profile?.nome ?? "—"}</b> ({target?.profile?.apelido ?? "—"})
                <br />
                Status atual: <b>{target?.status}</b> · numero atual:{" "}
                <b>{target?.numero ?? "(nenhum)"}</b>
              </p>
              <p className="text-xs text-muted-foreground">
                Ao confirmar: atribui número (se faltar), cria/aprova payment e marca como <b>ativa</b>.
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo (mín. 10 caracteres) — ex: PIX confirmado manualmente em conversa privada"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          ) as any
        }
        confirmLabel="Ativar quota"
        destructive={false}
        onConfirm={async () => {
          if (motivo.trim().length < 10) {
            toast.error("Motivo precisa de pelo menos 10 caracteres.");
            return;
          }
          try {
            await ativar.mutateAsync({ quotaId: target.id, motivo: motivo.trim() });
            toast.success("Quota ativada manualmente.");
            setTarget(null);
            setMotivo("");
          } catch (e: any) {
            toast.error(translatePgError(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!encerrarTarget}
        onOpenChange={(v) => { if (!v) { setEncerrarTarget(null); setMotivoEncerrar(""); } }}
        title="Encerrar quota?"
        description={
          (
            <div className="space-y-2 text-sm">
              <p>
                Pereba: <b>{encerrarTarget?.profile?.nome ?? "—"}</b> ({encerrarTarget?.profile?.apelido ?? "—"})
                <br />
                Status atual: <b>{encerrarTarget?.status}</b>
              </p>
              <p className="text-xs text-muted-foreground">
                A quota vai pra <b>encerrada</b> sem strike. Sem reembolso, sem ativação.
              </p>
              <select
                value=""
                onChange={(e) => e.target.value && setMotivoEncerrar(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sugestões de motivo…</option>
                {SUGESTOES_ENCERRAR.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <textarea
                value={motivoEncerrar}
                onChange={(e) => setMotivoEncerrar(e.target.value)}
                placeholder="Motivo (mín. 10 caracteres)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          ) as any
        }
        confirmLabel="Encerrar"
        destructive
        onConfirm={async () => {
          if (motivoEncerrar.trim().length < 10) {
            toast.error("Motivo precisa de pelo menos 10 caracteres.");
            return;
          }
          try {
            await encerrar.mutateAsync({ quotaId: encerrarTarget.id, motivo: motivoEncerrar.trim() });
            toast.success("Quota encerrada.");
            setEncerrarTarget(null);
            setMotivoEncerrar("");
          } catch (e: any) {
            toast.error(translatePgError(e));
          }
        }}
      />
    </div>
  );
}
