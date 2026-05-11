import { createFileRoute } from "@tanstack/react-router";
import { useTeamsAgrupados } from "@/lib/queries/teams";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/app/times")({
  head: () => ({ meta: [{ title: "Times da Copa — Bolão dos Perebas" }] }),
  component: TimesPage,
});

function TimesPage() {
  const { isLoading, grupos, data } = useTeamsAgrupados();
  const grupoKeys = Object.keys(grupos).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Times da Copa 2026</h1>
        <p className="mt-1 text-sm text-muted-foreground">48 seleções divididas em 12 grupos.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Globe} title="Times ainda não cadastrados" description="O admin vai semear a lista oficial em breve." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grupoKeys.map((g) => (
            <div key={g} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="font-display text-lg font-bold">Grupo {g}</h2>
              <ul className="mt-3 space-y-2">
                {grupos[g].map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="text-xl">{t.bandeira_emoji}</span>{t.nome_pt}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.bracket_position}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
