import { createFileRoute, useParams, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Trophy, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { useQuotasDoUsuario } from "@/lib/queries/quotas";
import { usePalpitesPublicosJogos, usePalpitesPublicosTop4 } from "@/lib/queries/public-profile";
import { useFaseAtual } from "@/lib/queries/top4";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { buildHeader, getTeamSide } from "@/lib/match-helpers";
import { PlacarJogo } from "@/components/placar-jogo";
import { EstatisticasPalpites } from "@/components/estatisticas-palpites";
import { times as mockTimes } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/pereba/$user_id")({
  head: () => ({ meta: [{ title: "Perfil do pereba — Bolão dos Perebas" }] }),
  validateSearch: (search: Record<string, unknown>): { quota?: number } => ({
    quota: search.quota == null ? undefined : Number(search.quota),
  }),
  component: PerebaPublicProfile,
});

function usePerebaPublic(user_id: string) {
  return useQuery({
    queryKey: ["pereba-public", user_id],
    queryFn: async () => {
      const [{ data: profileRows }, { data: ranking }] = await Promise.all([
        (supabase as any).rpc("get_profile_public", { p_user_id: user_id }),
        (supabase as any).rpc("get_ranking_geral"),
      ]);
      const profile = Array.isArray(profileRows) ? profileRows[0] ?? null : profileRows;
      const minhaLinha = (ranking ?? []).find((r: any) => r.user_id === user_id);
      return { profile, ranking: minhaLinha };
    },
  });
}

function PerebaPublicProfile() {
  const { user_id } = useParams({ from: "/app/pereba/$user_id" });
  const search = useSearch({ from: "/app/pereba/$user_id" });
  const navigate = useNavigate({ from: "/app/pereba/$user_id" });
  const { user } = useAuth();
  const [tab, setTab] = useState<"jogos" | "top4">("jogos");
  const { data: header, isLoading: loadingH } = usePerebaPublic(user_id);
  const { data: jogos = [], isLoading: loadingJ } = usePalpitesPublicosJogos(user_id);
  const { data: top4Rows = [] } = usePalpitesPublicosTop4(user_id);
  const { data: faseAtual = "antes_copa" } = useFaseAtual();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const { data: quotas = [] } = useQuotasDoUsuario(user_id);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  const quotaSearch = search?.quota;
  const quotasAtivas = quotas.filter((q) => q.status === "ativa" && q.numero != null);
  const temVariasQuotas = quotasAtivas.length > 1;

  const quotaSelecionada = useMemo(() => {
    if (!temVariasQuotas) return null;
    if (quotaSearch != null) {
      const n = Number(quotaSearch);
      const existe = quotasAtivas.some((q) => q.numero === n);
      if (existe) return n;
    }
    return null;
  }, [quotaSearch, quotasAtivas, temVariasQuotas]);

  const jogosFiltrados = useMemo(() => {
    if (quotaSelecionada == null) return jogos;
    return jogos.filter((j: any) => j.numero === quotaSelecionada);
  }, [jogos, quotaSelecionada]);

  const top4Filtrados = useMemo(() => {
    if (quotaSelecionada == null) return top4Rows;
    return top4Rows.filter((r: any) => r.quota_numero === quotaSelecionada);
  }, [top4Rows, quotaSelecionada]);

  if (loadingH) return <Skeleton className="h-64 w-full" />;
  if (!header?.profile) return <EmptyState icon={Trophy} title="Pereba não encontrado" description="Esse perfil não existe." />;

  const isMe = user_id === user?.id;
  const cor = isMe && header.profile.cor ? header.profile.cor : "oklch(0.6 0.16 200)";
  const apelido = header.profile.apelido ?? "??";
  const nome = header.profile.nome;
  const sigla = (header.profile.sigla ?? apelido).slice(0, 3).toUpperCase();
  const pos = header.ranking?.posicao;
  const pontos = header.ranking?.pontos ?? 0;

  const top4Liberado = ["round_32", "oitavas", "quartas", "semis", "final"].includes(faseAtual);

  return (
    <div className="space-y-6">
      <Link to="/app/ranking" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao ranking
      </Link>

      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-full text-base font-bold text-white" style={{ background: cor }}>
          {sigla}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold">{apelido}</h1>
          <p className="text-xs text-muted-foreground">{nome}</p>
        </div>
        <div className="text-right">
          {pos != null && <p className="text-xs text-muted-foreground">Posição</p>}
          {pos != null && <p className="font-display text-xl font-bold">#{pos}</p>}
          <p className="text-xs text-muted-foreground">{Number(pontos).toLocaleString("pt-BR")} pts</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["jogos", "top4"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t === "jogos" ? "Palpites de jogos" : "Palpite do Top 4"}
          </button>
        ))}
      </div>

      {temVariasQuotas && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => navigate({ search: (prev: any) => ({ ...prev, quota: undefined }) })}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              quotaSelecionada == null ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            Todas
          </button>
          {quotasAtivas.map((q) => (
          <button
              key={q.id}
              onClick={() => navigate({ search: (prev: any) => ({ ...prev, quota: q.numero }) })}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                quotaSelecionada === q.numero ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              Quota #{q.numero}
            </button>
          ))}
        </div>
      )}

      {tab === "jogos" && (
        <>
          {loadingJ ? (
            <Skeleton className="h-32 w-full" />
          ) : jogosFiltrados.length === 0 ? (
            <EmptyState icon={Lock} title={quotaSelecionada != null ? `Sem palpites na Quota #${quotaSelecionada}` : "Sem palpites públicos ainda"} description="Os palpites desse pereba ficam visíveis aqui assim que cada jogo trava." />
          ) : (
            <div className="space-y-3">
              {(jogosFiltrados as any[]).map((j) => {
                const tCasa = getTeamSide(j.team_home_id, j.slot_casa, j.casa, teamMap);
                const tFora = getTeamSide(j.team_away_id, j.slot_visitante, j.fora, teamMap);
                const head = buildHeader(j, stadiumMap);
                const acertou =
                  j.status === "encerrado" &&
                  j.palpite_casa === j.placar_casa &&
                  j.palpite_fora === j.placar_fora;
                return (
                  <article key={`${j.match_id}-${j.numero}`} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold">{head}</span>
                      <span>Quota #{j.numero}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden font-display font-bold sm:inline">{tCasa.nome}</span>
                        <span className="text-2xl">{tCasa.bandeira}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Palpite</p>
                        <p className="font-display text-2xl font-black">
                          {j.palpite_casa ?? "—"} <span className="text-muted-foreground">×</span> {j.palpite_fora ?? "—"}
                        </p>
                        {j.status === "encerrado" && (
                          <div className="mt-2">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Real</p>
                            <PlacarJogo
                              placar_casa={j.placar_casa}
                              placar_fora={j.placar_fora}
                              placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                              placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                              penaltis_casa={j.penaltis_casa}
                              penaltis_fora={j.penaltis_fora}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{tFora.bandeira}</span>
                        <span className="hidden font-display font-bold sm:inline">{tFora.nome}</span>
                      </div>
                    </div>
                    {j.status === "encerrado" && (
                      <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${acertou ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                          {j.pontos_calculados ?? 0} pts
                        </span>
                      </div>
                    )}
                    <EstatisticasPalpites match_id={j.match_id} travado_em={j.travado_em} />
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "top4" && (
        <>
          {!top4Liberado ? (
            <EmptyState icon={Lock} title="Top 4 ainda privado" description="Os palpites do Top 4 ficam visíveis a partir do Round of 32." />
          ) : top4Filtrados.length === 0 ? (
            <EmptyState icon={Trophy} title={quotaSelecionada != null ? `Sem palpite Top 4 na Quota #${quotaSelecionada}` : "Sem palpite Top 4"} description="Esse pereba não preencheu o Top 4." />
          ) : (
            <div className="space-y-4">
              {(top4Filtrados as any[]).map((row) => (
                <div key={row.quota_numero} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="text-xs text-muted-foreground">Quota #{row.quota_numero}</p>
                  <ul className="mt-3 space-y-2">
                    {[row.posicao_1, row.posicao_2, row.posicao_3, row.posicao_4].map((code, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold font-display text-xs font-bold text-gold-foreground">{i + 1}º</span>
                        <span className="text-2xl">{mockTimes[code]?.bandeira ?? "🏳️"}</span>
                        <span className="font-display font-bold">{mockTimes[code]?.nome ?? code ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
