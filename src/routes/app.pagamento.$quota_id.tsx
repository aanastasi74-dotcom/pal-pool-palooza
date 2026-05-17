import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Upload } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createStaticPix, hasError } from "@/lib/pix";
import { useSetting } from "@/lib/queries/settings";
import { useSubmitComprovanteLote } from "@/lib/queries/lotes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { translatePgError } from "@/lib/error-messages";

export const Route = createFileRoute("/app/pagamento/$quota_id")({
  head: () => ({ meta: [{ title: "Pagamento Pix — Bolão dos Perebas" }] }),
  component: Pagamento,
});

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

type PixConfig = {
  chave?: string;
  beneficiario?: string;
  cidade?: string;
  titular?: string; // legacy
  banco?: string;
  instrucoes?: string;
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

function Pagamento() {
  const { quota_id } = useParams({ from: "/app/pagamento/$quota_id" });
  const { user } = useAuth();
  const { data: pixConfig } = useSetting<PixConfig>("pix_config");
  const submitLote = useSubmitComprovanteLote();
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [quota, setQuota] = useState<any>(null);

  useEffect(() => {
    supabase.from("quotas").select("*").eq("id", quota_id).maybeSingle().then(({ data }) => setQuota(data));
  }, [quota_id]);

  const chave = pixConfig?.chave ?? "PLACEHOLDER";
  const beneficiario = pixConfig?.beneficiario ?? pixConfig?.titular ?? "BOLAO PEREBAS";
  const cidade = pixConfig?.cidade ?? "SAO PAULO";
  const valor = pixConfig?.valor_quota ?? 50;

  const pixPayload = useMemo(() => {
    try {
      const pix = createStaticPix({
        merchantName: sanitize(beneficiario, 25) || "BOLAO PEREBAS",
        merchantCity: sanitize(cidade, 15) || "SAO PAULO",
        pixKey: chave,
        infoAdicional: "",
        transactionAmount: Number(valor),
        txid: quota_id.replace(/-/g, "").slice(0, 25),
      });
      if (hasError(pix)) return null;
      return pix.toBRCode();
    } catch {
      return null;
    }
  }, [chave, beneficiario, cidade, valor, quota_id]);

  const onPickFile = (file: File | null) => {
    if (!file) return setArquivo(null);
    if (!ALLOWED_MIME.includes(file.type)) return toast.error("Tipo de arquivo inválido. Use PNG, JPG ou PDF.");
    if (file.size > MAX_SIZE) return toast.error("Arquivo grande demais (máx. 5 MB).");
    setArquivo(file);
  };

  const enviar = async () => {
    if (!arquivo || !user) return;
    setEnviando(true);
    try {
      // K.2: roteia para a RPC enviar_comprovante_lote via lote_id da quota.
      // Se a quota não tem lote_id (legado), abortar pedindo refresh — fluxo novo exige lote.
      const { data: q, error: qErr } = await supabase
        .from("quotas")
        .select("lote_id")
        .eq("id", quota_id)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!q?.lote_id) {
        toast.error("Quota sem lote associado — recarrega a página e tenta de novo, pereba.");
        setEnviando(false);
        return;
      }
      const res = await submitLote.mutateAsync({ loteId: q.lote_id, file: arquivo });
      if (!res.count || res.count < 1) {
        throw new Error("Falha ao registrar o comprovante da quota.");
      }
      setEnviado(true);
      toast.success("Comprovante enviado! Aguarda a aprovação do admin.");
      setTimeout(() => navigate({ to: "/app/quotas" }), 1500);
    } catch (e: any) {
      toast.error(translatePgError(e));
    } finally {
      setEnviando(false);
    }
  };

  const isReenvio = quota?.status === "rejeitada";
  const tentativas = quota?.tentativas_comprovante ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Pagar via Pix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quota — R$ {Number(valor).toFixed(2).replace(".", ",")}
        </p>
        {isReenvio && (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
            <p className="font-bold">Reenvio de comprovante</p>
            <p className="mt-1">Tentativa {tentativas + 1} de 3. Após 3 tentativas a quota é encerrada.</p>
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
          Após pagar, anexe o comprovante aqui no app. A quota só conta após aprovação manual de um admin.
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
          disabled={!arquivo || enviando || enviado}
          onClick={enviar}
          className="mt-4 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {enviado ? "Aguardando aprovação" : enviando ? "Enviando…" : "Enviar comprovante"}
        </button>
      </section>
    </div>
  );
}
