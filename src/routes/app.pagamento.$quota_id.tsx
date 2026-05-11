import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Upload, QrCode } from "lucide-react";
import { useSetting } from "@/lib/queries/settings";
import { useCreatePayment } from "@/lib/queries/payments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/pagamento/$quota_id")({
  head: () => ({ meta: [{ title: "Pagamento Pix — Bolão dos Perebas" }] }),
  component: Pagamento,
});

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

type PixConfig = { chave?: string; valor_quota?: number; instrucoes?: string };

function Pagamento() {
  const { quota_id } = useParams({ from: "/app/pagamento/$quota_id" });
  const { user } = useAuth();
  const { data: pixConfig } = useSetting<PixConfig>("pix_config");
  const createPayment = useCreatePayment();
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const chave = pixConfig?.chave ?? "perebas@bolao.com.br";
  const valor = pixConfig?.valor_quota ?? 50;

  const onPickFile = (file: File | null) => {
    if (!file) {
      setArquivo(null);
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use PNG, JPG ou PDF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo grande demais (máx. 5 MB).");
      return;
    }
    setArquivo(file);
  };

  const enviar = async () => {
    if (!arquivo || !user) return;
    setEnviando(true);
    try {
      const path = `${user.id}/${quota_id}/${Date.now()}-${arquivo.name}`;
      const { error: upErr } = await supabase.storage.from("comprovantes-pix").upload(path, arquivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: arquivo.type,
      });
      if (upErr) {
        toast.error("Não conseguimos enviar o comprovante. Tenta de novo, peraba.");
        setEnviando(false);
        return;
      }
      await createPayment.mutateAsync({ quota_id, valor, comprovante_path: path });
      setEnviado(true);
      toast.success("Comprovante enviado! Aguarda a aprovação do admin.");
      setTimeout(() => navigate({ to: "/app/quotas" }), 1500);
    } catch (e) {
      toast.error("Não conseguimos registrar o pagamento. Tenta de novo, peraba.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Pagar via Pix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quota — R$ {valor}. Vamos lá, perebas!
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="grid place-items-center rounded-2xl bg-secondary p-6">
          <div className="grid h-48 w-48 place-items-center rounded-2xl bg-background text-muted-foreground">
            <QrCode className="h-32 w-32" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Aponte a câmera do banco</p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Chave Pix</p>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3">
            <code className="flex-1 font-mono text-sm">{chave}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(chave);
                toast.success("Chave copiada!");
              }}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
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
