import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { usePaymentsAdmin, useApprovePayment, useRejectPayment, useReversePayment } from "@/lib/queries/payments";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Admin — Pagamentos" }] }),
  component: Pagamentos,
});

const fmt = (n: number) => `R$ ${Number(n).toLocaleString("pt-BR")}`;
const statusColor: Record<string, string> = {
  aprovado: "bg-success/15 text-success",
  pendente: "bg-accent/15 text-accent",
  rejeitado: "bg-destructive/15 text-destructive",
  estornado: "bg-muted text-muted-foreground",
};

type Pay = any;

function Pagamentos() {
  const { data: pays, isLoading } = usePaymentsAdmin();
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const reverse = useReversePayment();

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [aberto, setAberto] = useState<Pay | null>(null);
  const [rejeitarPay, setRejeitarPay] = useState<Pay | null>(null);
  const [estornarPay, setEstornarPay] = useState<Pay | null>(null);
  const [motivo, setMotivo] = useState("");

  const predicate = useCallback(
    (p: Pay, q: string) => {
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      const nome = (p.profile?.nome ?? "").toLowerCase();
      const apelido = (p.profile?.apelido ?? "").toLowerCase();
      if (q && !(nome.includes(q) || apelido.includes(q))) return false;
      if (dataIni || dataFim) {
        const d = new Date(p.created_at);
        if (dataIni && d < new Date(dataIni)) return false;
        if (dataFim && d > new Date(dataFim + "T23:59:59")) return false;
      }
      return true;
    },
    [filtroStatus, dataIni, dataFim],
  );

  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(
    pays ?? [],
    predicate,
    20,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conciliação dos Pix da perebada.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todos">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="estornado">Estornado</option>
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar participante…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">até</span>
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
        <span className="ml-auto text-xs text-muted-foreground">
          {total} pagamento(s) · página {page} de {totalPages}
        </span>
      </div>

      {total === 0 ? (
        <EmptyState title="Sem pagamentos por aqui" description="Perebada ainda não Pixou." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Participante</th>
                  <th className="p-3 text-left">Quota</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((p) => (
                  <tr key={p.id} onClick={() => setAberto(p)} className="cursor-pointer border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {p.profile?.nome ?? "—"}
                      {p.profile?.apelido && <span className="ml-1 text-xs text-muted-foreground">({p.profile.apelido})</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{p.quota?.numero ? `#${p.quota.numero}` : "—"}</td>
                    <td className="p-3 text-right font-display font-bold">{fmt(p.valor)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[p.status]}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      <Sheet open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <SheetContent className="w-[420px] overflow-y-auto sm:max-w-md">
          {aberto && (
            <DetalhePagamento
              pay={aberto}
              onApprove={async () => {
                await approve.mutateAsync(aberto.id);
                toast.success("Aprovado! O caldeirão tá engordando.");
                setAberto(null);
              }}
              onRejectClick={() => setRejeitarPay(aberto)}
              onReverseClick={() => setEstornarPay(aberto)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!rejeitarPay}
        onOpenChange={(v) => { if (!v) { setRejeitarPay(null); setMotivo(""); } }}
        title="Rejeitar pagamento?"
        description={
          <div className="space-y-2">
            <p>O participante verá o motivo e poderá reenviar o comprovante (até 3 tentativas).</p>
            <select
              value=""
              onChange={(e) => e.target.value && setMotivo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Sugestões de motivo…</option>
              <option value="Comprovante ilegível">Comprovante ilegível</option>
              <option value="Valor não bate (R$ 50)">Valor não bate (R$ 50)</option>
              <option value="PIX pra chave errada">PIX pra chave errada</option>
              <option value="Comprovante de outro pagamento">Comprovante de outro pagamento</option>
            </select>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo da rejeição (obrigatório)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div> as any
        }
        confirmLabel="Rejeitar"
        destructive
        onConfirm={async () => {
          if (!motivo.trim()) { toast.error("Informe um motivo."); return; }
          await reject.mutateAsync({ payment_id: rejeitarPay.id, motivo: motivo.trim() });
          toast.info("Pagamento rejeitado.");
          setRejeitarPay(null); setMotivo(""); setAberto(null);
        }}
      />

      <ConfirmDialog
        open={!!estornarPay}
        onOpenChange={(v) => { if (!v) { setEstornarPay(null); setMotivo(""); } }}
        title="Estornar pagamento?"
        description="A quota volta a ficar expirada."
        confirmLabel="Estornar"
        onConfirm={async () => {
          await reverse.mutateAsync({ payment_id: estornarPay.id, motivo: motivo.trim() || undefined });
          toast.info("Pagamento estornado.");
          setEstornarPay(null); setMotivo(""); setAberto(null);
        }}
      />
    </div>
  );
}

function DetalhePagamento({ pay, onApprove, onRejectClick, onReverseClick }: {
  pay: Pay;
  onApprove: () => void;
  onRejectClick: () => void;
  onReverseClick: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setSignedUrl(null);
    if (!pay.comprovante_path) return;
    setLoading(true);
    supabase.storage
      .from("comprovantes-pix")
      .createSignedUrl(pay.comprovante_path, 3600)
      .then(({ data }) => { if (mounted) setSignedUrl(data?.signedUrl ?? null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [pay.id, pay.comprovante_path]);

  const isImage = pay.comprovante_path && /\.(png|jpe?g|webp|gif)$/i.test(pay.comprovante_path);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{pay.profile?.nome ?? "Pagamento"} {pay.quota?.numero ? `#${pay.quota.numero}` : ""}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><b>{fmt(pay.valor)}</b></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{new Date(pay.created_at).toLocaleString("pt-BR")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[pay.status]}`}>{pay.status}</span></div>
        {pay.aprovado_em && <div className="flex justify-between"><span className="text-muted-foreground">Aprovado em</span><span>{new Date(pay.aprovado_em).toLocaleString("pt-BR")}</span></div>}
        {pay.motivo_rejeicao && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">Motivo: {pay.motivo_rejeicao}</div>}

        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-xs font-bold">Comprovante</p>
          {!pay.comprovante_path ? (
            <p className="text-xs text-muted-foreground">Sem comprovante anexado.</p>
          ) : loading ? (
            <Skeleton className="h-40 w-full" />
          ) : signedUrl ? (
            isImage ? (
              <img src={signedUrl} alt="Comprovante Pix" className="max-h-72 w-full rounded-lg border border-border object-contain" />
            ) : (
              <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <FileText className="h-3 w-3" /> Abrir comprovante <ExternalLink className="h-3 w-3" />
              </a>
            )
          ) : (
            <p className="text-xs text-destructive">Não consegui carregar o comprovante.</p>
          )}
        </div>

        {pay.status === "pendente" && (
          <div className="flex gap-2">
            <button onClick={onApprove} className="flex-1 rounded-full bg-success px-4 py-2 text-xs font-bold text-success-foreground">Aprovar</button>
            <button onClick={onRejectClick} className="flex-1 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground">Rejeitar</button>
          </div>
        )}
        {pay.status === "aprovado" && (
          <button onClick={onReverseClick} className="w-full rounded-full border border-border px-4 py-2 text-xs font-bold">Estornar pagamento</button>
        )}
      </div>
    </>
  );
}
