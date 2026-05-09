import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Upload, QrCode } from "lucide-react";

export const Route = createFileRoute("/app/pagamento/$quota_id")({
  head: () => ({ meta: [{ title: "Pagamento Pix — Bolão dos Perebas" }] }),
  component: Pagamento,
});

const PIX_KEY = "perebas@bolao.com.br";

function Pagamento() {
  const { quota_id } = useParams({ from: "/app/pagamento/$quota_id" });
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Pagar via Pix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quota_id === "nova" ? "Nova quota — R$ 50" : `Quota ${quota_id} — R$ 50`}. Vamos lá, perebas!
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
            <code className="flex-1 font-mono text-sm">{PIX_KEY}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PIX_KEY);
                toast.success("Chave copiada!");
              }}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Enviar comprovante</h2>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary px-6 py-10 text-center transition hover:border-primary">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">{comprovante ?? "Clique pra enviar"}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG ou PDF</p>
          <input
            type="file"
            className="hidden"
            onChange={(e) => setComprovante(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <button
          disabled={!comprovante || enviado}
          onClick={() => {
            setEnviado(true);
            toast.success("Comprovante enviado! Aguardando aprovação.");
          }}
          className="mt-4 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {enviado ? "Aguardando aprovação" : "Enviar comprovante"}
        </button>
      </section>
    </div>
  );
}
