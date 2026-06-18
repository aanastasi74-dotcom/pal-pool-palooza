import { createFileRoute } from "@tanstack/react-router";
import { useTeamsAgrupados } from "@/lib/queries/teams";
import { useClassificacaoGrupos, type LinhaClassificacao } from "@/lib/queries/classificacao";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/times")({
  head: () => ({ meta: [{ title: "Times da Copa — Bolão dos Perebas" }] }),
  component: TimesPage,
});

function TimesPage() {
  const { isLoading, grupos, data } = useTeamsAgrupados();
  const grupoKeys = Object.keys(grupos).sort();
  const classificacoes = useClassificacaoGrupos(grupoKeys);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Times da Copa 2026</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          48 seleções, 12 grupos. Top 2 de cada grupo + 8 melhores 3ºs avançam pro Round of 32.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Globe} title="Times ainda não cadastrados" description="O admin vai semear a lista oficial em breve." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grupoKeys.map((g, idx) => {
            const q = classificacoes[idx];
            return (
              <GrupoCard
                key={g}
                grupo={g}
                fallback={grupos[g]}
                rows={q?.data}
                loading={q?.isLoading ?? true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrupoCard({
  grupo,
  fallback,
  rows,
  loading,
}: {
  grupo: string;
  fallback: { id: string; nome_pt: string; bandeira_emoji: string; bracket_position: string }[];
  rows: LinhaClassificacao[] | undefined;
  loading: boolean;
}) {
  // Mapa bracket_position por team_id (pra exibir GA1, GA2, etc.)
  const bracketByTeam = new Map(fallback.map((t) => [t.id, t.bracket_position]));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Grupo {grupo}</h2>
      </div>
      {loading && !rows ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-1 py-1 text-left font-medium">Time</th>
                <th className="px-1 py-1 text-right font-medium">P</th>
                <th className="px-1 py-1 text-right font-medium">J</th>
                <th className="hidden px-1 py-1 text-right font-medium sm:table-cell">V</th>
                <th className="hidden px-1 py-1 text-right font-medium sm:table-cell">E</th>
                <th className="hidden px-1 py-1 text-right font-medium sm:table-cell">D</th>
                <th className="hidden px-1 py-1 text-right font-medium md:table-cell">GP</th>
                <th className="hidden px-1 py-1 text-right font-medium md:table-cell">GC</th>
                <th className="px-1 py-1 text-right font-medium">SG</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const slot = bracketByTeam.get(r.team_id);
                const top2 = r.posicao <= 2;
                const terceiro = r.posicao === 3;
                return (
                  <tr
                    key={r.team_id}
                    className={cn(
                      "border-t border-border/40",
                      top2 && "bg-emerald-500/10",
                      terceiro && "bg-amber-500/10",
                    )}
                  >
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{r.bandeira_emoji}</span>
                        <span className="truncate font-medium">{r.team_nome}</span>
                        {slot ? (
                          <span className="ml-auto pl-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                            {slot}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-1 py-1.5 text-right font-bold">{r.pontos}</td>
                    <td className="px-1 py-1.5 text-right tabular-nums">{r.jogos}</td>
                    <td className="hidden px-1 py-1.5 text-right tabular-nums sm:table-cell">{r.vitorias}</td>
                    <td className="hidden px-1 py-1.5 text-right tabular-nums sm:table-cell">{r.empates}</td>
                    <td className="hidden px-1 py-1.5 text-right tabular-nums sm:table-cell">{r.derrotas}</td>
                    <td className="hidden px-1 py-1.5 text-right tabular-nums md:table-cell">{r.gols_pro}</td>
                    <td className="hidden px-1 py-1.5 text-right tabular-nums md:table-cell">{r.gols_contra}</td>
                    <td className="px-1 py-1.5 text-right tabular-nums">
                      {r.saldo > 0 ? `+${r.saldo}` : r.saldo}
                    </td>
                  </tr>
                );
              })}
              {(!rows || rows.length === 0) &&
                fallback.map((t) => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{t.bandeira_emoji}</span>
                        <span className="truncate font-medium">{t.nome_pt}</span>
                        <span className="ml-auto pl-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {t.bracket_position}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-1.5 text-right text-muted-foreground">—</td>
                    <td className="px-1 py-1.5 text-right text-muted-foreground">—</td>
                    <td className="hidden px-1 py-1.5 text-right text-muted-foreground sm:table-cell">—</td>
                    <td className="hidden px-1 py-1.5 text-right text-muted-foreground sm:table-cell">—</td>
                    <td className="hidden px-1 py-1.5 text-right text-muted-foreground sm:table-cell">—</td>
                    <td className="hidden px-1 py-1.5 text-right text-muted-foreground md:table-cell">—</td>
                    <td className="hidden px-1 py-1.5 text-right text-muted-foreground md:table-cell">—</td>
                    <td className="px-1 py-1.5 text-right text-muted-foreground">—</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
