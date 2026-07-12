import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, BarChart3, Lock, XCircle } from "lucide-react";
import { useTop4Estatisticas, type TeamStat } from "@/lib/queries/top4-estatisticas";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/palpites_/top4_/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas Top 4 — Bolão dos Perebas" }] }),
  component: EstatisticasTop4Page,
});

function EstatisticasTop4Page() {
  const navigate = useNavigate();
  const { data, isLoading } = useTop4Estatisticas();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  if (!data.liberado) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate({ to: "/app/palpites/top4" })}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Voltar
        </button>
        <EmptyState
          icon={Lock}
          title="Ainda não liberado"
          description={
            data.libera_em
              ? `Estatísticas ficam disponíveis a partir de ${new Date(data.libera_em).toLocaleString("pt-BR")}.`
              : "Aguardando liberação."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate({ to: "/app/palpites/top4" })}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3 w-3" /> Voltar pro Top 4
      </button>

      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Estatísticas Top 4
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Base: <strong>{data.base_quotas} quotas</strong> · {data.base_quotas * 4} palpites totais
        </p>
      </div>

      <BlocoStats titulo="🏆 Times mais escolhidos" subtitulo="Qualquer posição no Top 4 (soma ≈ 400%)" stats={data.qualquer_posicao} base={data.base_quotas} />
      <BlocoStats titulo="🥇 Escolhas para CAMPEÃO" subtitulo="Soma = 100%" stats={data.campeao} base={data.base_quotas} />
      <BlocoStats titulo="🥈 Escolhas para VICE" subtitulo="Soma = 100%" stats={data.vice} base={data.base_quotas} />
      <BlocoStats titulo="🥉 Escolhas para 3º LUGAR" subtitulo="Soma = 100%" stats={data.terceiro} base={data.base_quotas} />
      <BlocoStats titulo="4️⃣ Escolhas para 4º LUGAR" subtitulo="Soma = 100%" stats={data.quarto} base={data.base_quotas} />
    </div>
  );
}

function BlocoStats({
  titulo,
  subtitulo,
  stats,
  base,
}: {
  titulo: string;
  subtitulo: string;
  stats: TeamStat[];
  base: number;
}) {
  const maxPct = stats[0]?.percentual ?? 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3">
        <h2 className="font-display text-base font-bold">{titulo}</h2>
        <p className="text-[11px] text-muted-foreground">{subtitulo}</p>
      </div>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ninguém escolheu ainda.</p>
      ) : (
        <ul className="space-y-2">
          {stats.map((s) => (
            <li key={s.bracket_position} className="flex items-center gap-2">
              {s.bandeira_emoji && <span className="text-base leading-none">{s.bandeira_emoji}</span>}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${s.eliminado ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {s.nome_pt}
                    {s.eliminado && <XCircle className="inline ml-1 h-3 w-3 text-destructive" />}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    <strong className="text-foreground">
                      {s.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                    </strong>{" "}
                    ({s.votos}/{base})
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.eliminado ? "bg-muted-foreground/40" : "bg-primary"}`}
                    style={{ width: `${maxPct > 0 ? (s.percentual / maxPct) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
