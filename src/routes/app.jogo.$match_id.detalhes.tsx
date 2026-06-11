import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Radio, Goal, BarChart3, Users, Clock, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PlacarJogo } from "@/components/placar-jogo";

export const Route = createFileRoute("/app/jogo/$match_id/detalhes")({
  head: () => ({ meta: [{ title: "Detalhes do jogo — Bolão dos Perebas" }] }),
  component: DetalhesDoJogo,
});

type TeamMini = { nome_pt: string; bandeira_emoji: string };
type Evento = any;
type DetalhesResp = {
  match: {
    id: string;
    numero_jogo: number | null;
    data_jogo: string;
    peso: number;
    estadio: string | null;
    cidade: string | null;
    status: string;
    fase: string;
    placar_casa: number | null;
    placar_fora: number | null;
    placar_casa_prorrogacao: number | null;
    placar_fora_prorrogacao: number | null;
    penaltis_casa: number | null;
    penaltis_fora: number | null;
    home_team: TeamMini;
    away_team: TeamMini;
    eventos: Evento[];
  };
  estatisticas: any[] | null;
  escalacoes: any[] | null;
  fonte_stats: "cache" | "api" | "indisponivel";
};

function useMatchDetalhes(match_id: string) {
  return useQuery({
    queryKey: ["match-detalhes", match_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-match-details", {
        body: { match_id },
      });
      if (error) throw error;
      return data as DetalhesResp;
    },
    staleTime: 30_000,
  });
}

function statusBadge(status: string) {
  if (status === "ao-vivo") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
        <Radio className="h-3 w-3 animate-pulse" /> AO VIVO
      </span>
    );
  }
  if (status === "encerrado") {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
        ENCERRADO
      </span>
    );
  }
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
      AGENDADO
    </span>
  );
}

function StatBar({
  label,
  casa,
  fora,
}: {
  label: string;
  casa: number | string | null;
  fora: number | string | null;
}) {
  const nCasa = typeof casa === "string" ? parseFloat(casa) : casa ?? 0;
  const nFora = typeof fora === "string" ? parseFloat(fora) : fora ?? 0;
  const total = (nCasa ?? 0) + (nFora ?? 0);
  const pctCasa = total > 0 ? Math.round(((nCasa ?? 0) / total) * 100) : 50;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{casa ?? "—"}</span>
        <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
        <span>{fora ?? "—"}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
        <div className="bg-primary" style={{ width: `${pctCasa}%` }} />
        <div className="bg-accent" style={{ width: `${100 - pctCasa}%` }} />
      </div>
    </div>
  );
}

function pickStat(team: any, ...types: string[]): string | number | null {
  if (!team?.statistics) return null;
  for (const type of types) {
    const s = team.statistics.find(
      (x: any) => (x.type ?? "").toLowerCase() === type.toLowerCase(),
    );
    if (s && s.value != null) return s.value;
  }
  return null;
}

function DetalhesDoJogo() {
  const { match_id } = Route.useParams();
  const { data, isLoading, error } = useMatchDetalhes(match_id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Não consegui carregar os detalhes"
        description={(error as any)?.message ?? "Tenta de novo daqui a pouco."}
      />
    );
  }

  const { match, estatisticas, escalacoes } = data;
  const dataFmt = new Date(match.data_jogo).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const gols = (match.eventos ?? []).filter(
    (e: any) => (e?.type ?? "").toLowerCase() === "goal",
  );

  // Para mapear eventos ao time, comparar nome com home/away.
  const homeNomeApi = match.home_team.nome_pt;

  const casaStats = estatisticas?.[0];
  const foraStats = estatisticas?.[1];

  return (
    <div className="space-y-5">
      <Link
        to="/app/jogos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar pros jogos
      </Link>

      <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">
            {match.numero_jogo ? `Jogo #${match.numero_jogo} · ` : ""}
            {match.fase}
            {match.estadio ? ` · ${match.estadio}` : ""}
            {match.cidade ? ` · ${match.cidade}` : ""}
          </span>
          <span className="flex items-center gap-2">
            {statusBadge(match.status)}
            <span>peso {match.peso}</span>
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {dataFmt} (Brasília)
        </p>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center justify-end gap-3">
            <p className="font-display text-base font-bold sm:text-lg">{match.home_team.nome_pt}</p>
            <span className="text-4xl">{match.home_team.bandeira_emoji}</span>
          </div>
          <div className="text-center">
            {match.status !== "agendado" ? (
              <div className="font-display text-3xl font-black">
                <PlacarJogo
                  placar_casa={match.placar_casa}
                  placar_fora={match.placar_fora}
                  placar_casa_prorrogacao={match.placar_casa_prorrogacao}
                  placar_fora_prorrogacao={match.placar_fora_prorrogacao}
                  penaltis_casa={match.penaltis_casa}
                  penaltis_fora={match.penaltis_fora}
                  size="lg"
                />
              </div>
            ) : (
              <p className="font-display text-3xl font-black text-muted-foreground">×</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{match.away_team.bandeira_emoji}</span>
            <p className="font-display text-base font-bold sm:text-lg">{match.away_team.nome_pt}</p>
          </div>
        </div>
      </article>

      {/* Linha do tempo de gols */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Goal className="h-5 w-5 text-primary" /> Gols
        </h2>
        {gols.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {match.status === "encerrado"
              ? "Sem gols nesse jogo."
              : match.status === "ao-vivo"
                ? "Nenhum gol até o momento."
                : "Jogo ainda não começou."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {gols.map((g: any, i: number) => {
              const teamName = g?.team?.name ?? "—";
              const isHome = teamName === homeNomeApi;
              const minuto = g?.time?.elapsed != null
                ? `${g.time.elapsed}'${g.time.extra ? `+${g.time.extra}` : ""}`
                : "—";
              const jogador = g?.player?.name ?? "—";
              const assist = g?.assist?.name ?? null;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3 text-sm"
                >
                  <span className="w-12 shrink-0 font-display font-black text-primary">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {minuto}
                  </span>
                  <span className="text-xl">
                    {isHome ? match.home_team.bandeira_emoji : match.away_team.bandeira_emoji}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{jogador}</p>
                    {assist && (
                      <p className="text-xs text-muted-foreground">assistência: {assist}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {match.status === "agendado" && (
        <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          O jogo ainda não começou. Estatísticas e escalações ficam disponíveis quando o jogo terminar.
        </div>
      )}

      {match.status === "ao-vivo" && (
        <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Estatísticas completas e escalações ficam disponíveis após o jogo encerrar. Por enquanto, só placar e gols.
        </div>
      )}

      {/* Estatísticas */}
      {match.status === "encerrado" && estatisticas && casaStats && foraStats && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <BarChart3 className="h-5 w-5 text-primary" /> Estatísticas
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatBar
              label="Posse de bola"
              casa={pickStat(casaStats, "Ball Possession")}
              fora={pickStat(foraStats, "Ball Possession")}
            />
            <StatBar
              label="Finalizações"
              casa={pickStat(casaStats, "Total Shots", "Shots Total")}
              fora={pickStat(foraStats, "Total Shots", "Shots Total")}
            />
            <StatBar
              label="No gol"
              casa={pickStat(casaStats, "Shots on Goal")}
              fora={pickStat(foraStats, "Shots on Goal")}
            />
            <StatBar
              label="Escanteios"
              casa={pickStat(casaStats, "Corner Kicks", "Corners")}
              fora={pickStat(foraStats, "Corner Kicks", "Corners")}
            />
            <StatBar
              label="Faltas"
              casa={pickStat(casaStats, "Fouls")}
              fora={pickStat(foraStats, "Fouls")}
            />
            <StatBar
              label="Amarelos"
              casa={pickStat(casaStats, "Yellow Cards")}
              fora={pickStat(foraStats, "Yellow Cards")}
            />
            <StatBar
              label="Vermelhos"
              casa={pickStat(casaStats, "Red Cards")}
              fora={pickStat(foraStats, "Red Cards")}
            />
            <StatBar
              label="Passes certos"
              casa={pickStat(casaStats, "Passes accurate")}
              fora={pickStat(foraStats, "Passes accurate")}
            />
          </div>
        </section>
      )}

      {/* Escalações */}
      {match.status === "encerrado" && escalacoes && escalacoes.length >= 2 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <ListChecks className="h-5 w-5 text-primary" /> Escalações iniciais
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {[escalacoes[0], escalacoes[1]].map((lineup: any, idx: number) => {
              const ehCasa = lineup?.team?.name === homeNomeApi || idx === 0;
              const team = ehCasa ? match.home_team : match.away_team;
              return (
                <div key={idx}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{team.bandeira_emoji}</span>
                    <p className="font-display font-bold">{team.nome_pt}</p>
                    {lineup?.formation && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
                        {lineup.formation}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 text-sm">
                    {(lineup?.startXI ?? []).map((p: any, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="w-6 text-right font-bold text-muted-foreground">
                          {p?.player?.number ?? "—"}
                        </span>
                        <span>{p?.player?.name ?? "—"}</span>
                        {p?.player?.pos && (
                          <span className="text-xs text-muted-foreground">({p.player.pos})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {lineup?.substitutes?.length > 0 && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer font-bold text-muted-foreground">
                        Reservas ({lineup.substitutes.length})
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {lineup.substitutes.map((p: any, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="w-6 text-right font-bold text-muted-foreground">
                              {p?.player?.number ?? "—"}
                            </span>
                            <span>{p?.player?.name ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <Link
          to="/app/jogo/$match_id/palpites"
          params={{ match_id }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Users className="h-3 w-3" /> Ver palpites dos perebas pra este jogo
        </Link>
      </div>
    </div>
  );
}
