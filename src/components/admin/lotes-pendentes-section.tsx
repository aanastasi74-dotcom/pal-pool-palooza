import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ExternalLink, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLotesAguardando, useApproveLote, useRejectLote, useEncerrarLotePorDecisao } from "@/lib/queries/lotes";
import { translatePgError } from "@/lib/error-messages";

const fmt = (n: number) => `R$ ${Number(n).toLocaleString("pt-BR")}`;

export function LotesPendentesSection() {
  const { data: lotes = [], isLoading } = useLotesAguardando();
  const approve = useApproveLote();
  const reject = useRejectLote();
  const encerrar = useEncerrarLotePorDecisao();

  const [parcialLote, setParcialLote] = useState<any | null>(null);
  const [parcialN, setParcialN] = useState(1);
  const [rejeitarLote, setRejeitarLote] = useState<any | null>(null);
  const [encerrarLote, setEncerrarLote] = useState<any | null>(null);
  const [motivoEncerrar, setMotivoEncerrar] = useState("");
  const [motivo, setMotivo] = useState("");

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (lotes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Lotes aguardando aprovação ({lotes.length})</h2>
      </div>
      <div className="grid gap-3">
        {lotes.map((l: any) => (
          <LoteCard
            key={l.id}
            lote={l}
            onApproveAll={async () => {
              await approve.mutateAsync({ loteId: l.id });
              toast.success(`Lote aprovado — ${l.quantidade_pedida} quotas ativas.`);
            }}
            onPartial={() => {
              setParcialN(Math.max(1, l.quantidade_pedida - 1));
              setParcialLote(l);
            }}
            onReject={() => setRejeitarLote(l)}
            onEncerrar={() => { setEncerrarLote(l); setMotivoEncerrar(""); }}
          />
        ))}
      </div>

      {/* Parcial */}
      <ConfirmDialog
        open={!!parcialLote}
        onOpenChange={(v) => !v && setParcialLote(null)}
        title={`Aprovar parcial — lote de ${parcialLote?.quantidade_pedida ?? 0} quotas`}
        description={
          (
            <div className="space-y-2">
              <p>Quantas quotas aprovar? As restantes serão rejeitadas com motivo automático.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={(parcialLote?.quantidade_pedida ?? 1) - 1}
                  value={parcialN}
                  onChange={(e) => setParcialN(Number(e.target.value))}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <span className="text-xs text-muted-foreground">
                  de {parcialLote?.quantidade_pedida} (R$ {parcialN * 50},00 aprovado)
                </span>
              </div>
            </div>
          ) as any
        }
        confirmLabel="Aprovar parcial"
        destructive={false}
        onConfirm={async () => {
          const max = (parcialLote.quantidade_pedida ?? 1) - 1;
          if (parcialN < 1 || parcialN > max) {
            toast.error(`Valor entre 1 e ${max}.`);
            return;
          }
          await approve.mutateAsync({ loteId: parcialLote.id, aprovarN: parcialN });
          toast.info(`Aprovado parcial: ${parcialN} de ${parcialLote.quantidade_pedida}.`);
          setParcialLote(null);
        }}
      />

      {/* Rejeitar */}
      <ConfirmDialog
        open={!!rejeitarLote}
        onOpenChange={(v) => { if (!v) { setRejeitarLote(null); setMotivo(""); } }}
        title={`Rejeitar lote de ${rejeitarLote?.quantidade_pedida ?? 0} quotas?`}
        description={
          (
            <div className="space-y-2">
              <p>O participante verá o motivo. Tentativas: {(rejeitarLote?.tentativas_comprovante ?? 0) + 1} de 3.</p>
              <select
                value=""
                onChange={(e) => e.target.value && setMotivo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sugestões de motivo…</option>
                <option value="Comprovante ilegível">Comprovante ilegível</option>
                <option value="Valor não bate">Valor não bate</option>
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
            </div>
          ) as any
        }
        confirmLabel="Rejeitar todas"
        destructive
        onConfirm={async () => {
          if (!motivo.trim()) { toast.error("Informe um motivo."); return; }
          await reject.mutateAsync({ loteId: rejeitarLote.id, motivo: motivo.trim() });
          toast.info("Lote rejeitado.");
          setRejeitarLote(null);
          setMotivo("");
        }}
      />
    </div>
  );
}

function LoteCard({
  lote,
  onApproveAll,
  onPartial,
  onReject,
}: {
  lote: any;
  onApproveAll: () => void;
  onPartial: () => void;
  onReject: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!lote.comprovante_url) return;
    let alive = true;
    supabase.storage
      .from("comprovantes-pix")
      .createSignedUrl(lote.comprovante_url, 3600)
      .then(({ data }) => { if (alive) setSignedUrl(data?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [lote.comprovante_url]);

  const isImage = lote.comprovante_url && /\.(png|jpe?g|webp|gif)$/i.test(lote.comprovante_url);
  const tentativaTxt = `${lote.tentativas_comprovante ?? 1}ª tentativa`;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold">
            {lote.profile?.nome ?? "—"}
            {lote.profile?.apelido && (
              <span className="ml-1 text-xs text-muted-foreground">({lote.profile.apelido})</span>
            )}
          </p>
          <p className="text-sm">
            <b>Lote de {lote.quantidade_pedida} quotas</b> — {lote.quantidade_pedida} × R$ 50 ={" "}
            <b>{fmt(lote.valor_esperado)}</b>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(lote.criado_em).toLocaleString("pt-BR")} · {tentativaTxt}
          </p>
        </div>
        <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
          aguardando
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-border p-2">
        {!lote.comprovante_url ? (
          <p className="text-xs text-muted-foreground">Sem comprovante.</p>
        ) : signedUrl ? (
          isImage ? (
            <img src={signedUrl} alt="Comprovante" className="max-h-56 w-full rounded-lg object-contain" />
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <FileText className="h-3 w-3" /> Abrir comprovante <ExternalLink className="h-3 w-3" />
            </a>
          )
        ) : (
          <Skeleton className="h-32 w-full" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={onApproveAll}
          className="rounded-full bg-success px-3 py-2 text-xs font-bold text-success-foreground"
        >
          Aprovar todas ({lote.quantidade_pedida})
        </button>
        <button
          onClick={onPartial}
          disabled={lote.quantidade_pedida < 2}
          className="rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-40"
        >
          Aprovar parcial…
        </button>
        <button
          onClick={onReject}
          className="rounded-full bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"
        >
          Rejeitar todas
        </button>
      </div>
    </article>
  );
}
