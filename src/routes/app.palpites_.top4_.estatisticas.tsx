import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, BarChart3, Lock } from "lucide-react";
import { useTop4Estatisticas, type TeamStat } from "@/lib/queries/top4-estatisticas";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { LABEL_ESTADO, corDoEstado, estaEliminadoDaCopa, type PosicaoApostada } from "@/lib/top4-status";

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

      <BlocoStats titulo="🏆 Times mais escolhidos" subtitulo="Qualquer posição no Top 4 (soma ≈ 400%)" stats={data.qualquer_posicao} base={data.base_quotas} posicaoRef="qualquer" />
      <BlocoStats titulo="🥇 Escolhas para CAMPEÃO" subtitulo="Soma = 100%" stats={data.campeao} base={data.base_quotas} posicaoRef="campeao" />
      <BlocoStats titulo="🥈 Escolhas para VICE" subtitulo="Soma = 100%" stats={data.vice} base={data.base_quotas} posicaoRef="vice" />
      <BlocoStats titulo="🥉 Escolhas para 3º LUGAR" subtitulo="Soma = 100%" stats={data.terceiro} base={data.base_quotas} posicaoRef="terceiro" />
      <BlocoStats titulo="4️⃣ Escolhas para 4º LUGAR" subtitulo="Soma = 100%" stats={data.quarto} base={data.base_quotas} posicaoRef="quarto" />
    </div>
  );
}

function BlocoStats({
  titulo,
  subtitulo,
  stats,
  base,
  posicaoRef,
}: {
  titulo: string;
  subtitulo: string;
  stats: TeamStat[];
  base: number;
  posicaoRef: PosicaoApostada | "qualquer";
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
          {stats.map((s) => {
            const foraDaCopa = estaEliminadoDaCopa(s.estado);
            const clsLabel = posicaoRef === "qualquer"
              ? (foraDaCopa ? "text-destructive" : "text-success")
              : corDoEstado(s.estado, posicaoRef as PosicaoApostada);
            const barCls = clsLabel.includes("destructive")
              ? "bg-destructive/60"
              : clsLabel.includes("success")
                ? "bg-success"
                : "bg-primary";
            const labelStatus = s.estado ? LABEL_ESTADO[s.estado] : "";
            return (
              <li key={s.bracket_position} className="flex items-center gap-2">
                {s.bandeira_emoji && <span className="text-base leading-none">{s.bandeira_emoji}</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm font-medium ${foraDaCopa ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {s.nome_pt}
                      {labelStatus && (
                        <span className={`ml-1.5 text-[10px] font-semibold ${clsLabel}`}>
                          · {labelStatus}
                        </span>
                      )}
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
                      className={`h-full rounded-full ${barCls}`}
                      style={{ width: `${maxPct > 0 ? (s.percentual / maxPct) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
