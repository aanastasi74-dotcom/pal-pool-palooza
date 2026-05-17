import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Upload, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createStaticPix, hasError } from "@/lib/pix";
import { useSetting } from "@/lib/queries/settings";
import { useLote, useSubmitComprovanteLote } from "@/lib/queries/lotes";
import { Skeleton } from "@/components/ui/skeleton";
import { translatePgError } from "@/lib/error-messages";

export const Route = createFileRoute("/app/pagamento-lote/$lote_id")({
  head: () => ({ meta: [{ title: "Pagamento do lote — Bolão dos Perebas" }] }),
  component: PagamentoLote,
});

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;
const VALOR_QUOTA = 50;

type PixConfig = {
  chave?: string;
  beneficiario?: string;
  cidade?: string;
  titular?: string;
  valor_quota?: number;
};

function sanitize(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

function PagamentoLote() {
  const { lote_id } = useParams({ from: "/app/pagamento-lote/$lote_id" });
  const { data: pixConfig } = useSetting<PixConfig>("pix_config");
  const { data, isLoading } = useLote(lote_id);
  const submit = useSubmitComprovanteLote();
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviado, setEnviado] = useState(false);

  const lote = data?.lote;
  const quantidade = lote?.quantidade_pedida ?? data?.quotas.length ?? 1;
  const valorTotal = (lote?.valor_esperado ?? quantidade * VALOR_QUOTA) as number;

  const chave = pixConfig?.chave ?? "PLACEHOLDER";
  const beneficiario = pixConfig?.beneficiario ?? pixConfig?.titular ?? "BOLAO PEREBAS";
  const cidade = pixConfig?.cidade ?? "SAO PAULO";

  const pixPayload = useMemo(() => {
    try {
      const pix = createStaticPix({
        merchantName: sanitize(beneficiario, 25) || "BOLAO PEREBAS",
        merchantCity: sanitize(cidade, 15) || "SAO PAULO",
        pixKey: chave,
        infoAdicional: "",
        transactionAmount: Number(valorTotal),
        txid: lote_id.replace(/-/g, "").slice(0, 25),
      });
      if (hasError(pix)) return null;
      return pix.toBRCode();
    } catch {
      return null;
    }
  }, [chave, beneficiario, cidade, valorTotal, lote_id]);

  const onPickFile = (file: File | null) => {
    if (!file) return setArquivo(null);
    if (!ALLOWED_MIME.includes(file.type)) return toast.error("Tipo de arquivo inválido. Use PNG, JPG ou PDF.");
    if (file.size > MAX_SIZE) return toast.error("Arquivo grande demais (máx. 5 MB).");
    setArquivo(file);
  };

  const enviar = async () => {
    if (!arquivo) return;
    try {
      const res = await submit.mutateAsync({ loteId: lote_id, file: arquivo });
      if (!res.count || res.count < 1) {
        throw new Error("Falha ao registrar o comprovante do lote.");
      }
      setEnviado(true);
      toast.success(`Comprovante de ${res.count} quota(s) enviado! Aguarda aprovação.`);
      setTimeout(() => navigate({ to: "/app/quotas" }), 1500);
    } catch (e: any) {
      toast.error(translatePgError(e));
    }
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!lote) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Lote não encontrado.
        </div>
      </div>
    );
  }

  const isReenvio = lote.status === "rejeitado";
  const tentativas = lote.tentativas_comprovante ?? 0;
  const totalFmt = Number(valorTotal).toFixed(2).replace(".", ",");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Pagar via Pix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quantidade} {quantidade === 1 ? "quota" : "quotas"} × R$ 50,00 = <b>R$ {totalFmt}</b>
        </p>
        {isReenvio && (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
            <p className="font-bold">Reenvio de comprovante</p>
            <p className="mt-1">Tentativa {tentativas + 1} de 3. Após 3 tentativas o lote é encerrado.</p>
            {lote.motivo_rejeicao && <p className="mt-1 text-destructive">Motivo anterior: {lote.motivo_rejeicao}</p>}
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="grid place-items-center rounded-2xl bg-secondary p-6">
          {pixPayload ? (
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={pixPayload} size={208} />
            </div>
          ) : (
            <div className="grid h-52 w-52 place-items-center rounded-2xl bg-background text-center text-xs text-muted-foreground">
              QR indisponível.<br />Configure pix_config.
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Aponte a câmera do banco</p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Chave Pix</p>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3">
            <code className="flex-1 truncate font-mono text-sm">{chave}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(chave); toast.success("Chave copiada!"); }}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {pixPayload && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pix Copia e Cola</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3">
              <code className="flex-1 truncate font-mono text-[11px]">{pixPayload}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(pixPayload); toast.success("Código copiado!"); }}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-2xl border-2 border-accent/60 bg-gold/30 p-4 text-sm text-gold-foreground shadow-card">
        <p className="font-bold">⚠️ Não esqueça, pereba!</p>
        <p className="mt-1 text-foreground">
          Pagou R$ {totalFmt} num PIX único. Anexa o comprovante aqui e o admin aprova
          {quantidade > 1 ? ` as ${quantidade} quotas` : " a quota"} de uma vez.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Enviar comprovante</h2>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary px-6 py-10 text-center transition hover:border-primary">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">{arquivo?.name ?? "Clique pra enviar"}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG ou PDF · até 5 MB</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          disabled={!arquivo || submit.isPending || enviado}
          onClick={enviar}
          className="mt-4 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {enviado ? "Aguardando aprovação" : submit.isPending ? "Enviando…" : `Enviar comprovante (R$ ${totalFmt})`}
        </button>
      </section>
    </div>
  );
}
