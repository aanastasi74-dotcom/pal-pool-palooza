import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Trophy, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { usePalpitesPublicosJogos, usePalpitesPublicosTop4 } from "@/lib/queries/public-profile";
import { useFaseAtual } from "@/lib/queries/top4";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { buildHeader, getTeamSide } from "@/lib/match-helpers";
import { times as mockTimes } from "@/lib/mock-data";

export const Route = createFileRoute("/app/pereba/$user_id")({
  head: () => ({ meta: [{ title: "Perfil do pereba — Bolão dos Perebas" }] }),
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
  const [tab, setTab] = useState<"jogos" | "top4">("jogos");
  const { data: header, isLoading: loadingH } = usePerebaPublic(user_id);
  const { data: jogos = [], isLoading: loadingJ } = usePalpitesPublicosJogos(user_id);
  const { data: top4Rows = [] } = usePalpitesPublicosTop4(user_id);
  const { data: faseAtual = "antes_copa" } = useFaseAtual();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  if (loadingH) return <Skeleton className="h-64 w-full" />;
  if (!header?.profile) return <EmptyState icon={Trophy} title="Pereba não encontrado" description="Esse perfil não existe." />;

  const cor = header.profile.cor ?? "oklch(0.6 0.16 200)";
  const apelido = header.profile.apelido ?? "??";
  const nome = header.profile.nome;
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
          {apelido}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold">{nome}</h1>
          <p className="text-xs text-muted-foreground">{apelido}</p>
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

      {tab === "jogos" && (
        <>
          {loadingJ ? (
            <Skeleton className="h-32 w-full" />
          ) : jogos.length === 0 ? (
            <EmptyState icon={Lock} title="Sem palpites públicos ainda" description="Os palpites desse pereba ficam visíveis aqui assim que cada jogo trava." />
          ) : (
            <div className="space-y-3">
              {(jogos as any[]).map((j) => {
                const tCasa = getTeamSide(j.team_home_id, j.slot_casa, j.casa, teamMap);
                const tFora = getTeamSide(j.team_away_id, j.slot_visitante, j.fora, teamMap);
                const head = buildHeader(j, stadiumMap);
                const acertou =
                  j.status === "encerrado" &&
                  j.placar_casa_palpite === j.placar_casa_real &&
                  j.placar_fora_palpite === j.placar_fora_real;
                return (
                  <article key={`${j.match_id}-${j.quota_numero}`} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold">{head}</span>
                      <span>Quota #{j.quota_numero}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden font-display font-bold sm:inline">{tCasa.nome}</span>
                        <span className="text-2xl">{tCasa.bandeira}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Palpite</p>
                        <p className="font-display text-2xl font-black">
                          {j.placar_casa_palpite ?? "—"} <span className="text-muted-foreground">×</span> {j.placar_fora_palpite ?? "—"}
                        </p>
                        {j.status === "encerrado" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Real: <strong>{j.placar_casa_real} × {j.placar_fora_real}</strong>
                          </p>
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
                          {j.pontos ?? 0} pts
                        </span>
                      </div>
                    )}
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
          ) : top4Rows.length === 0 ? (
            <EmptyState icon={Trophy} title="Sem palpite Top 4" description="Esse pereba não preencheu o Top 4." />
          ) : (
            <div className="space-y-4">
              {(top4Rows as any[]).map((row) => (
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
