import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Lock, Minus, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { translatePgError } from "@/lib/error-messages";
import { useCriarLoteInscricao, useInscricaoContexto } from "@/lib/queries/inscricao";

export const Route = createFileRoute("/app/inscricao/$slug")({
  head: () => ({
    meta: [
      { title: "Garantir minhas quotas — Bolão dos Perebas" },
      { name: "description", content: "Escolha quantas quotas você quer nesta competição e pague via Pix." },
    ],
  }),
  component: InscricaoPage,
});

function brl(v: number) {
  return Number(v).toFixed(2).replace(".", ",");
}

function InscricaoPage() {
  const { slug } = useParams({ from: "/app/inscricao/$slug" });
  const navigate = useNavigate();
  const { data, isLoading } = useInscricaoContexto(slug);
  const criarLote = useCriarLoteInscricao(slug);
  const [qtd, setQtd] = useState(1);

  const disponivel = data?.disponivel ?? 0;
  useEffect(() => {
    if (disponivel > 0) setQtd((v) => Math.min(Math.max(1, v), disponivel));
  }, [disponivel]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar pro lobby
        </Link>
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          Competição não encontrada ou indisponível para inscrição.
        </div>
      </div>
    );
  }

  const { competicao, loteAberto, jaTem, limite } = data;
  const preco = Number(competicao.preco_quota ?? 0);
  const aberta = competicao.status === "inscricoes" || competicao.status === "ativa";
  const total = qtd * preco;

  const voltar = (
    <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ArrowLeft className="h-3 w-3" /> Voltar pro lobby
    </Link>
  );

  const cabecalho = (
    <div>
      {voltar}
      <h1 className="mt-2 break-words font-display text-2xl font-extrabold sm:text-3xl">Garantir minhas quotas</h1>
      <p className="mt-1 break-words text-sm text-muted-foreground">{competicao.nome}</p>
    </div>
  );

  if (!aberta) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {cabecalho}
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>Inscrições encerradas</b> — não é mais possível comprar quotas de {competicao.nome_curto}.
          </p>
        </div>
      </div>
    );
  }

  if (loteAberto) {
    const rotulos: Record<string, { titulo: string; texto: string; acao?: string }> = {
      incompleta: {
        titulo: "Pagamento pendente",
        texto: `Você reservou ${loteAberto.quantidade_pedida} quota(s) por R$ ${brl(Number(loteAberto.valor_esperado))}. Falta pagar e enviar o comprovante.`,
        acao: "Pagar agora",
      },
      aguardando_aprovacao: {
        titulo: "Comprovante em análise",
        texto: `Recebemos o comprovante de ${loteAberto.quantidade_pedida} quota(s). O admin aprova em breve.`,
      },
      rejeitado: {
        titulo: "Comprovante rejeitado",
        texto: loteAberto.motivo_rejeicao
          ? `Motivo: ${loteAberto.motivo_rejeicao}`
          : "Envie um novo comprovante para seguir com a inscrição.",
        acao: "Reenviar comprovante",
      },
    };
    const info = rotulos[loteAberto.status] ?? rotulos.incompleta;
    const alerta = loteAberto.status === "rejeitado";

    return (
      <div className="mx-auto max-w-xl space-y-4">
        {cabecalho}
        <section
          className={`rounded-3xl border p-5 shadow-card ${
            alerta ? "border-destructive/40 bg-destructive/10" : "border-border bg-card"
          }`}
        >
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            {alerta ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            ) : loteAberto.status === "aguardando_aprovacao" ? (
              <Clock className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="break-words">{info.titulo}</span>
          </p>
          <p className="mt-2 break-words text-sm text-muted-foreground">{info.texto}</p>
          {info.acao && (
            <Link
              to="/app/pagamento-lote/$lote_id"
              params={{ lote_id: loteAberto.id }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow sm:w-auto"
            >
              {info.acao}
            </Link>
          )}
        </section>
      </div>
    );
  }

  if (disponivel < 1) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {cabecalho}
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          Você já tem <b>{jaTem}</b> de <b>{limite}</b> quotas nesta competição — seu limite está completo. 🎉
        </div>
      </div>
    );
  }

  const comprar = () => {
    criarLote.mutate(
      { competicao, quantidade: qtd },
      {
        onSuccess: (loteId) => navigate({ to: "/app/pagamento-lote/$lote_id", params: { lote_id: loteId } }),
        onError: (e) => toast.error(translatePgError(e)),
      },
    );
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {cabecalho}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quantas quotas você quer?
        </p>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setQtd((v) => Math.max(1, v - 1))}
            disabled={qtd <= 1}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-secondary disabled:opacity-40"
            aria-label="Diminuir"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="grid w-20 place-items-center sm:w-24">
            <span className="font-display text-4xl font-extrabold sm:text-5xl">{qtd}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {qtd === 1 ? "quota" : "quotas"}
            </span>
          </div>
          <button
            onClick={() => setQtd((v) => Math.min(disponivel, v + 1))}
            disabled={qtd >= disponivel}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-secondary disabled:opacity-40"
            aria-label="Aumentar"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-secondary p-4 text-center">
          <p className="font-display text-2xl font-bold">R$ {brl(total)}</p>
          <p className="break-words text-[11px] text-muted-foreground">
            {qtd} × R$ {brl(preco)}
          </p>
        </div>

        <p className="mt-3 break-words text-xs text-muted-foreground">
          Seu limite nesta competição: <b>{limite}</b> · já suas: <b>{jaTem}</b> · disponíveis: <b>{disponivel}</b>
        </p>

        <button
          onClick={comprar}
          disabled={criarLote.isPending || preco <= 0}
          className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {criarLote.isPending ? "Reservando…" : "Continuar pro pagamento"}
        </button>
        {preco <= 0 && (
          <p className="mt-2 text-xs text-destructive">Preço da quota ainda não definido para esta competição.</p>
        )}
      </section>
    </div>
  );
}
