import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePodeComprarQuota, useCreateOrUpdateLote } from "@/lib/queries/lotes";
import { usePodeCriarQuota } from "@/lib/queries/copa";
import { useMaintenanceMode } from "@/hooks/use-maintenance";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/comprar-quota")({
  head: () => ({ meta: [{ title: "Comprar quotas — Bolão dos Perebas" }] }),
  component: ComprarQuotaPage,
});

const VALOR = 50;
const MAX_HARD = 10;

function ComprarQuotaPage() {
  const navigate = useNavigate();
  const [qtd, setQtd] = useState(1);
  const { data: podeCriar = true, isLoading: loadingCopa } = usePodeCriarQuota();
  const { data: pode, isLoading: loadingPode } = usePodeComprarQuota(qtd);
  const createLote = useCreateOrUpdateLote();
  const { readOnly } = useMaintenanceMode();

  const max = Math.min(
    MAX_HARD,
    pode?.restantes_individual ?? MAX_HARD,
    pode?.restantes_global ?? MAX_HARD,
  );
  const totalReais = (qtd * VALOR).toFixed(2).replace(".", ",");

  const dec = () => setQtd((v) => Math.max(1, v - 1));
  const inc = () => setQtd((v) => Math.min(max || 1, v + 1));

  const handleContinuar = () => {
    createLote.mutate(qtd, {
      onSuccess: (loteId) =>
        navigate({ to: "/app/pagamento-lote/$lote_id", params: { lote_id: loteId } }),
      onError: (e: any) => toast.error(e?.message ?? "Não foi possível criar o lote."),
    });
  };

  if (loadingCopa || loadingPode) {
    return <Skeleton className="h-72 w-full" />;
  }

  // I.5.8 — modo somente-leitura bloqueia novas compras (palpites continuam liberados).
  if (readOnly) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="flex items-start gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/15 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>Bolão em manutenção.</b> Compras de quotas estão temporariamente bloqueadas.
            Volta já — quem já tem quota ativa pode palpitar normalmente.
          </p>
        </div>
      </div>
    );
  }

  if (!podeCriar) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>Compras encerradas</b> — o primeiro jogo da Copa já começou (11/06, 19h).
            Boa Copa, pereba! 🍀
          </p>
        </div>
      </div>
    );
  }

  if (pode && pode.pode === false) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-bold text-destructive">Não dá pra comprar agora</p>
          <p className="mt-1 text-foreground">{pode.motivo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link to="/app/quotas" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Comprar quotas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada quota é um time independente. Você pode comprar várias num único PIX.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quantas quotas você quer?
        </p>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={dec}
            disabled={qtd <= 1}
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-secondary disabled:opacity-40"
            aria-label="Diminuir"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="grid w-24 place-items-center">
            <span className="font-display text-5xl font-extrabold">{qtd}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {qtd === 1 ? "quota" : "quotas"}
            </span>
          </div>
          <button
            onClick={inc}
            disabled={qtd >= max}
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-secondary disabled:opacity-40"
            aria-label="Aumentar"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-secondary p-4 text-center">
          <p className="font-display text-2xl font-bold">R$ {totalReais}</p>
          <p className="text-[11px] text-muted-foreground">
            {qtd} × R$ 50,00
          </p>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Limite individual restante: <b>{pode?.restantes_individual ?? "—"}</b> · Vagas no bolão:{" "}
          <b>{pode?.restantes_global ?? "—"}</b>
        </p>

        {qtd > 1 && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
            Você está comprando <b>{qtd} quotas</b> num PIX único. Após pagar, anexe o comprovante
            e o admin aprova todas juntas.
          </div>
        )}

        <button
          onClick={handleContinuar}
          disabled={createLote.isPending}
          className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {createLote.isPending ? "Criando lote…" : "Continuar pra pagamento"}
        </button>
      </section>
    </div>
  );
}
