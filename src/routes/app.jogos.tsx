import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lock, Radio, CalendarSearch, Users, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useMatches } from "@/lib/queries/matches";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyPredictions } from "@/lib/queries/predictions";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { Skeleton } from "@/components/ui/skeleton";
import { buildHeader, getTeamSide } from "@/lib/match-helpers";
import { PlacarJogo } from "@/components/placar-jogo";
import { EstatisticasPalpites } from "@/components/estatisticas-palpites";

export const Route = createFileRoute("/app/jogos")({
  head: () => ({ meta: [{ title: "Jogos — Bolão dos Perebas" }] }),
  component: Jogos,
});

const filtros = ["Todos", "Hoje", "Fase de grupos", "Oitavas", "Quartas", "Semifinais", "Final"];

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function travaEm(iso?: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function Jogos() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("Todos");
  const { data: matches = [], isLoading } = useMatches();
  const { data: quotas = [] } = useMinhasQuotas();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const primeiraQuota = quotas[0];
  const { data: minhasPreds = [] } = useMyPredictions(primeiraQuota?.id);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const lista = (matches as any[]).filter((j) => {
    if (filtro === "Todos") return true;
    if (filtro === "Hoje") return fmtData(j.data_jogo) === hoje;
    return (j.fase ?? "").toLowerCase() === filtro.toLowerCase();
  });

  const predMap = new Map((minhasPreds as any[]).map((p) => [p.match_id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">{matches.length} partidas · palpites travam 5 minutos antes do apito inicial</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              filtro === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="Sem jogos cadastrados"
          description="Jogos ainda não foram cadastrados. Aguarda os admins importarem o calendário, pereba."
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="Nenhum jogo nesse filtro"
          description="Tenta mudar pra outra fase — a perebada não palpita no vazio."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((j) => {
            const pred = predMap.get(j.id);
            const trava = travaEm(j.travado_em);
            const tCasa = getTeamSide(j.team_home_id, j.slot_casa, j.casa, teamMap);
            const tFora = getTeamSide(j.team_away_id, j.slot_visitante, j.fora, teamMap);
            const header = buildHeader(j, stadiumMap);
            return (
              <article key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">{header}</span>
                  <span className="flex items-center gap-2">
                    {j.status === "ao-vivo" && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                        <Radio className="h-3 w-3 animate-pulse" /> AO VIVO
                      </span>
                    )}
                    <span>peso {j.peso}</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {fmtData(j.data_jogo)} · {fmtHora(j.data_jogo)} (Brasília)
                </p>

                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="flex items-center justify-end gap-3">
                    <div className="text-right">
                      <p className="font-display font-bold">{tCasa.nome}</p>
                    </div>
                    <span className="text-3xl">{tCasa.bandeira}</span>
                  </div>

                  <div className="text-center">
                    {j.status === "encerrado" || j.status === "ao-vivo" ? (
                      <PlacarJogo
                        placar_casa={j.placar_casa}
                        placar_fora={j.placar_fora}
                        placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                        placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                        penaltis_casa={j.penaltis_casa}
                        penaltis_fora={j.penaltis_fora}
                      />
                    ) : (
                      <p className="font-display text-2xl font-black text-muted-foreground">×</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{tFora.bandeira}</span>
                    <div>
                      <p className="font-display font-bold">{tFora.nome}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Seu palpite</p>
                    <p className="font-display text-base font-bold">
                      {pred && pred.placar_casa != null ? `${pred.placar_casa} × ${pred.placar_fora}` : <span className="text-destructive">— sem palpite —</span>}
                    </p>
                  </div>
                  {(() => {
                    const palpitesVisiveis = !!j.travado_em && new Date(j.travado_em).getTime() <= Date.now();
                    const locked = j.status !== "agendado" || palpitesVisiveis;
                    if (!locked) {
                      return (
                        <div className="flex items-center gap-2">
                          {trava && (
                            <span className="rounded-full bg-accent/40 px-2 py-1 text-[10px] font-bold text-accent-foreground">
                              trava em {trava}
                            </span>
                          )}
                          <button
                            onClick={() => navigate({ to: "/app/palpites", search: { match_id: j.id } as any })}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                          >
                            {pred ? "Editar" : "Palpitar"}
                          </button>
                        </div>
                      );
                    }
                    if (palpitesVisiveis) {
                      return (
                        <Link
                        to="/app/jogo/$match_id/palpites"
                        params={{ match_id: j.id }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                        >
                          <Users className="h-3 w-3" /> Ver todos os palpites
                        </Link>
                      );
                    }
                    return (
                      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Lock className="h-3 w-3" /> travado
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-3 flex justify-end">
                  <Link
                    to="/app/jogo/$match_id/detalhes"
                    params={{ match_id: j.id }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                  >
                    <BarChart3 className="h-3 w-3" /> Detalhes do jogo
                  </Link>
                </div>

                <EstatisticasPalpites
                  match_id={j.id}
                  travado_em={j.travado_em}
                  minhas_quotas_ids={(quotas as any[]).map((q) => q.id)}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
