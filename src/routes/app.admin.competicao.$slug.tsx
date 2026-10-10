import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Trophy } from "lucide-react";
import { useCompeticaoStatus } from "@/lib/queries/admin-cancelamento";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { LotesAprovacaoSection } from "@/components/admin/lotes-aprovacao-section";
import { PromotoresSection } from "@/components/admin/promotores-section";
import { IncentivosSection } from "@/components/admin/incentivos-section";
import { CancelamentoSection } from "@/components/admin/cancelamento-section";

export const Route = createFileRoute("/app/admin/competicao/$slug")({
  head: () => ({ meta: [{ title: "Admin — Competição" }] }),
  component: ConsoleGenerico,
});

const statusStyle: Record<string, string> = {
  arquivada: "bg-muted text-muted-foreground",
  encerrada: "bg-muted text-muted-foreground",
  cancelada: "bg-destructive/15 text-destructive",
  rascunho: "bg-muted text-muted-foreground",
  pesquisa: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  inscricoes: "bg-success/15 text-success",
  ativa: "bg-success/15 text-success",
};

function ConsoleGenerico() {
  const { slug } = Route.useParams();
  const { data: comp, isLoading } = useCompeticaoStatus(slug);

  if (isLoading) return <Skeleton className="h-32" />;

  if (!comp) {
    return (
      <EmptyState
        title="Competição não encontrada"
        description="Esse endereço não corresponde a nenhuma competição."
        cta={
          <Link to="/app/admin" className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
            Voltar ao admin
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="min-w-0 font-display text-3xl font-extrabold break-words">{comp.nome_curto}</h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              statusStyle[comp.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {(comp.status === "arquivada" || comp.status === "encerrada") && <Lock className="h-3 w-3" />}
            {comp.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground break-words">{comp.nome}</p>
      </div>

      <LotesAprovacaoSection slug={slug} />
      <PromotoresSection slug={slug} />
      <IncentivosSection slug={slug} />
      <CancelamentoSection slug={slug} />
    </div>
  );
}
