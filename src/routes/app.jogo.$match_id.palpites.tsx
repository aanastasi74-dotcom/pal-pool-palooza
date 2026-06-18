import { createFileRoute, Link } from "@tanstack/react-router";
import { getUserTimezoneLabel } from "@/lib/user-timezone";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMatch } from "@/lib/queries/matches";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { buildHeader, getTeamSide } from "@/lib/match-helpers";
import { PlacarJogo } from "@/components/placar-jogo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/jogo/$match_id/palpites")({
  head: () => ({ meta: [{ title: "Palpites do jogo — Bolão dos Perebas" }] }),
  component: PalpitesDoJogo,
});

type Linha = {
  quota_id: string;
  quota_numero: number;
  user_id: string;
  apelido: string;
  sigla: string | null;
  cor: string | null;
  placar_casa: number | null;
  placar_fora: number | null;
  pontos: number | null;
  posicao_ranking: number | null;
};


function usePalpitesJogo(match_id: string, enabled: boolean, aoVivo: boolean) {
  return useQuery({
    queryKey: ["palpites-jogo", match_id],
    enabled: enabled && !!match_id,
    refetchInterval: aoVivo ? 15000 : false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_palpites_jogo", {
        p_match_id: match_id,
      });
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
  });
}

function PalpitesDoJogo() {
  const { match_id } = Route.useParams();
  const { user } = useAuth();
  const { data: match, isLoading: loadingMatch } = useMatch(match_id);
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  const travado =
    !!match?.travado_em && new Date(match.travado_em).getTime() <= Date.now();
  const aoVivo = match?.status === "ao-vivo";

  const { data: linhas = [], isLoading: loadingP, refetch: refetchPalpites } =
    usePalpitesJogo(match_id, travado, aoVivo);

  useEffect(() => {
    if (!aoVivo || !match_id) return;
    const channel = supabase
      .channel(`match-${match_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match_id}` },
        () => {
          refetchPalpites();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [match_id, aoVivo, refetchPalpites]);

  // Refetch imediato ao montar durante jogo ao vivo (dados provisórios)
  useEffect(() => {
    if (aoVivo) {
      refetchPalpites();
    }
  }, [aoVivo, refetchPalpites]);
  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<"apelido" | "placar" | "ranking">("apelido");

  if (loadingMatch) return <Skeleton className="h-64 w-full" />;
  if (!match) {
    return (
      <EmptyState
        icon={Lock}
        title="Jogo não encontrado"
        description="Volta pra lista de jogos."
      />
    );
  }
  if (!travado) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/jogos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar pros jogos
        </Link>
        <EmptyState
          icon={Lock}
          title="Palpites ainda privados"
          description="Os palpites de todos os perebas ficam disponíveis 5 minutos antes do apito inicial."
        />
      </div>
    );
  }

  const tCasa = getTeamSide(match.team_home_id, match.slot_casa, match.casa, teamMap);
  const tFora = getTeamSide(match.team_away_id, match.slot_visitante, match.fora, teamMap);
  const header = buildHeader(match, stadiumMap);
  const dataFmt = match.data_jogo
    ? new Date(match.data_jogo).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const encerrado = match.status === "encerrado";

  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = linhas.filter(
    (l) =>
      !buscaNorm ||
      l.apelido?.toLowerCase().includes(buscaNorm) ||
      (l.sigla ?? "").toLowerCase().includes(buscaNorm),
  );
  const totalPalpites = linhas.filter(
    (l) => l.placar_casa != null && l.placar_fora != null,
  ).length;
  const totalQuotas = linhas.length;
  const ordenadas = [...filtradas].sort((a, b) => {
    const aSem = a.placar_casa == null || a.placar_fora == null;
    const bSem = b.placar_casa == null || b.placar_fora == null;
    if (sort === "placar") {
      if (aSem && !bSem) return 1;
      if (!aSem && bSem) return -1;
      if (aSem && bSem) return a.apelido.localeCompare(b.apelido, "pt-BR");
      const ac = a.placar_casa ?? -1, af = a.placar_fora ?? -1;
      const bc = b.placar_casa ?? -1, bf = b.placar_fora ?? -1;
      if (ac !== bc) return bc - ac;
      if (af !== bf) return bf - af;
      return a.apelido.localeCompare(b.apelido, "pt-BR");
    }
    if (sort === "ranking") {
      const ap = a.posicao_ranking ?? 9999;
      const bp = b.posicao_ranking ?? 9999;
      if (ap !== bp) return ap - bp;
      return a.apelido.localeCompare(b.apelido, "pt-BR");
    }
    const cmp = a.apelido.localeCompare(b.apelido, "pt-BR");
    if (cmp !== 0) return cmp;
    return a.quota_numero - b.quota_numero;
  });

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
          <span className="font-semibold">{header}</span>
          <span>peso {match.peso}</span>
        </div>
        {dataFmt && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {dataFmt} ({getUserTimezoneLabel()})
          </p>
        )}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center justify-end gap-3">
            <p className="font-display font-bold">{tCasa.nome}</p>
            <span className="text-3xl">{tCasa.bandeira}</span>
          </div>
          <div className="text-center">
            {encerrado || match.status === "ao-vivo" ? (
              <PlacarJogo
                placar_casa={match.placar_casa}
                placar_fora={match.placar_fora}
                placar_casa_prorrogacao={match.placar_casa_prorrogacao}
                placar_fora_prorrogacao={match.placar_fora_prorrogacao}
                penaltis_casa={match.penaltis_casa}
                penaltis_fora={match.penaltis_fora}
              />
            ) : (
              <p className="font-display text-2xl font-black text-muted-foreground">×</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tFora.bandeira}</span>
            <p className="font-display font-bold">{tFora.nome}</p>
          </div>
        </div>
      </article>

      {aoVivo && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="uppercase tracking-wider">Ao vivo</span>
          <span className="font-normal opacity-80">· Pontos provisórios com base no placar atual</span>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-extrabold">Todos os palpites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalPalpites} palpite{totalPalpites === 1 ? "" : "s"} de {totalQuotas} quota
          {totalQuotas === 1 ? "" : "s"} ativa{totalQuotas === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar apelido ou sigla…"
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1 shadow-card">
          <button
            onClick={() => setSort("apelido")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              sort === "apelido" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Por apelido
          </button>
          <button
            onClick={() => setSort("placar")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              sort === "placar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Por placar
          </button>
          <button
            onClick={() => setSort("ranking")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              sort === "ranking" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Por ranking
          </button>
        </div>
      </div>

      {loadingP ? (
        <Skeleton className="h-64 w-full" />
      ) : ordenadas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum palpite encontrado"
          description={busca ? "Tenta outra busca." : "Ainda não tem palpites pra esse jogo."}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pereba</TableHead>
                <TableHead className="hidden sm:table-cell">Sigla</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>Ranking</TableHead>
                <TableHead className="text-center">Palpite</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((l) => {
                const semPalpite = l.placar_casa == null || l.placar_fora == null;
                return (
                  <TableRow
                    key={l.quota_id}
                    className={`${l.user_id === user?.id ? "bg-secondary" : ""} ${semPalpite ? "opacity-60" : ""}`.trim() || undefined}
                  >
                    <TableCell>
                      <Link
                        to="/app/pereba/$user_id"
                        params={{ user_id: l.user_id }}
                        className="font-semibold hover:underline"
                        style={l.user_id === user?.id && l.cor ? { color: l.cor } : undefined}
                      >
                        {l.apelido}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {l.sigla ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">#{l.quota_numero}</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {l.posicao_ranking != null ? `#${l.posicao_ranking}` : "—"}
                    </TableCell>
                    <TableCell className="text-center font-display font-black">
                      {semPalpite ? (
                        <span className="text-xs font-normal italic text-muted-foreground">
                          — sem palpite —
                        </span>
                      ) : (
                        `${l.placar_casa} × ${l.placar_fora}`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {semPalpite
                        ? "—"
                        : (encerrado || aoVivo) && l.pontos != null
                          ? l.pontos
                          : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
