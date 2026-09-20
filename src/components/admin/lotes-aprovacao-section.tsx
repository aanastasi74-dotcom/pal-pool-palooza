import { useEffect, useState } from "react";
import { ExternalLink, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { translatePgError } from "@/lib/error-messages";
import { type LoteAdmin, useAdminLotes, useAprovarLote, useRejeitarLote } from "@/lib/queries/admin-lotes";

const brl = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const ROTULO_STATUS: Record<string, string> = {
  incompleta: "aguardando comprovante",
  rejeitado: "rejeitado",
  aguardando_aprovacao: "aguardando aprovação",
};

export function LotesAprovacaoSection({ slug }: { slug: string }) {
  const { data, isLoading, error } = useAdminLotes(slug);
  const aprovar = useAprovarLote(slug);
  const rejeitar = useRejeitarLote(slug);

  const [parcialLote, setParcialLote] = useState<LoteAdmin | null>(null);
  const [parcialN, setParcialN] = useState(1);
  const [rejeitarAlvo, setRejeitarAlvo] = useState<LoteAdmin | null>(null);
  const [motivo, setMotivo] = useState("");
  const [verSecundarios, setVerSecundarios] = useState(false);

  if (isLoading) return <Skeleton className="h-48" />;
  if (error || !data) return <p className="text-sm text-destructive">Não foi possível carregar os lotes.</p>;

  const somenteLeitura = data.competicao.status === "arquivada" || data.competicao.status === "encerrada";

  const aprovarLote = async (lote: LoteAdmin, aprovarN?: number) => {
    try {
      const r = await aprovar.mutateAsync({ loteId: lote.id, aprovarN });
      const quantas = aprovarN ?? lote.quantidade_pedida;
      toast.success(`Lote de ${lote.apelido} aprovado — ${quantas} de ${lote.quantidade_pedida} quotas.`);
      if (!r.emailOk) toast.warning("Aprovado, mas o e-mail falhou — avise o pereba manualmente.");
    } catch (e) {
      toast.error(translatePgError(e));
    }
  };

  return (
    <section className="space-y-4" aria-labelledby={`lotes-${slug}`}>
      <div>
        <h2 id={`lotes-${slug}`} className="flex items-center gap-2 font-display text-xl font-bold">
          <Layers className="h-5 w-5 text-primary" /> Aprovação de lotes
          {data.aguardando.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
              {data.aguardando.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprovantes e quotas de {data.competicao.nomeCurto}.
        </p>
      </div>

      {somenteLeitura && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Competição encerrada — fila disponível somente para consulta.
        </p>
      )}

      {data.aguardando.length === 0 ? (
        <EmptyState title="Nenhum lote aguardando" description="Nada na fila de aprovação agora." />
      ) : (
        <div className="grid gap-3">
          {data.aguardando.map((lote) => (
            <LoteCard
              key={lote.id}
              lote={lote}
              somenteLeitura={somenteLeitura}
              ocupado={aprovar.isPending || rejeitar.isPending}
              onAprovarTudo={() => aprovarLote(lote)}
              onParcial={() => {
                setParcialN(Math.max(1, lote.quantidade_pedida - 1));
                setParcialLote(lote);
              }}
              onRejeitar={() => {
                setMotivo("");
                setRejeitarAlvo(lote);
              }}
            />
          ))}
        </div>
      )}

      {data.secundarios.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setVerSecundarios((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
          >
            <span>Outros lotes ({data.secundarios.length})</span>
            <span className="text-xs text-muted-foreground">{verSecundarios ? "ocultar" : "mostrar"}</span>
          </button>
          {verSecundarios && (
            <ul className="divide-y divide-border border-t border-border">
              {data.secundarios.map((lote) => (
                <li key={lote.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="min-w-0 break-words">
                    <b>{lote.apelido}</b> — {lote.quantidade_pedida} quotas · {brl(lote.valor_esperado)}
                    {lote.motivo_rejeicao && (
                      <span className="block text-xs text-muted-foreground">Motivo: {lote.motivo_rejeicao}</span>
                    )}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {ROTULO_STATUS[lote.status] ?? lote.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!parcialLote}
        onOpenChange={(v) => !v && setParcialLote(null)}
        title={`Aprovar parcial — lote de ${parcialLote?.quantidade_pedida ?? 0} quotas`}
        description={
          (
            <div className="space-y-2">
              <p>Quantas quotas aprovar? As restantes serão rejeitadas automaticamente.</p>
              <input
                type="number"
                min={1}
                max={Math.max(1, (parcialLote?.quantidade_pedida ?? 1) - 1)}
                value={parcialN}
                onChange={(e) => setParcialN(Number(e.target.value))}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ) as unknown as string
        }
        confirmLabel="Aprovar parcial"
        onConfirm={async () => {
          const alvo = parcialLote;
          if (!alvo) return;
          const max = alvo.quantidade_pedida - 1;
          if (parcialN < 1 || parcialN > max) {
            toast.error(`Informe um valor entre 1 e ${max}.`);
            return;
          }
          setParcialLote(null);
          await aprovarLote(alvo, parcialN);
        }}
      />

      <ConfirmDialog
        open={!!rejeitarAlvo}
        onOpenChange={(v) => {
          if (!v) {
            setRejeitarAlvo(null);
            setMotivo("");
          }
        }}
        title={`Rejeitar lote de ${rejeitarAlvo?.quantidade_pedida ?? 0} quotas?`}
        description={
          (
            <div className="space-y-2">
              <p>O pereba verá o motivo e poderá reenviar o comprovante.</p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo da rejeição (obrigatório, mín. 3 caracteres)"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ) as unknown as string
        }
        confirmLabel="Rejeitar lote"
        destructive
        onConfirm={async () => {
          const alvo = rejeitarAlvo;
          if (!alvo) return;
          const texto = motivo.trim();
          if (texto.length < 3) {
            toast.error("Motivo precisa de pelo menos 3 caracteres.");
            return;
          }
          setRejeitarAlvo(null);
          setMotivo("");
          try {
            const r = await rejeitar.mutateAsync({ loteId: alvo.id, motivo: texto });
            toast.info(`Lote de ${alvo.apelido} rejeitado.`);
            if (!r.emailOk) toast.warning("Rejeitado, mas o e-mail falhou — avise o pereba manualmente.");
          } catch (e) {
            toast.error(translatePgError(e));
          }
        }}
      />
    </section>
  );
}

function LoteCard({
  lote,
  somenteLeitura,
  ocupado,
  onAprovarTudo,
  onParcial,
  onRejeitar,
}: {
  lote: LoteAdmin;
  somenteLeitura: boolean;
  ocupado: boolean;
  onAprovarTudo: () => void;
  onParcial: () => void;
  onRejeitar: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!lote.comprovante_url) return;
    let alive = true;
    supabase.storage
      .from("comprovantes-pix")
      .createSignedUrl(lote.comprovante_url, 3600)
      .then(({ data }) => {
        if (alive) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [lote.comprovante_url]);

  const isImage = !!lote.comprovante_url && /\.(png|jpe?g|webp|gif)$/i.test(lote.comprovante_url);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-bold break-words">
            {lote.nome} <span className="text-xs text-muted-foreground">({lote.apelido})</span>
          </p>
          <p className="text-sm break-words">
            <b>{lote.quantidade_pedida} quotas</b> — {brl(lote.valor_esperado)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(lote.criado_em).toLocaleString("pt-BR")} · {Math.max(1, lote.tentativas_comprovante)}ª tentativa
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

      {!somenteLeitura && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            onClick={onAprovarTudo}
            disabled={ocupado}
            className="rounded-full bg-success px-3 py-2 text-xs font-bold text-success-foreground disabled:opacity-40"
          >
            Aprovar todas ({lote.quantidade_pedida})
          </button>
          <button
            onClick={onParcial}
            disabled={ocupado || lote.quantidade_pedida < 2}
            className="rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-40"
          >
            Aprovar parcial…
          </button>
          <button
            onClick={onRejeitar}
            disabled={ocupado}
            className="rounded-full bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-40"
          >
            Rejeitar
          </button>
        </div>
      )}
    </article>
  );
}
