import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { getUserTimezoneLabel } from "@/lib/user-timezone";
import { useMemo, useState } from "react";
import { Lock, Radio, CalendarSearch, Users, BarChart3, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useMatches } from "@/lib/queries/matches";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyPredictions, useAllMyPredictions } from "@/lib/queries/predictions";
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

const filtros = ["Próximos", "Hoje", "Amanhã", "Esta semana", "Encerrados", "Todos"] as const;
type Filtro = (typeof filtros)[number];



// Retorna [start, end) em ms para um dia BRT (UTC-3, sem DST).
function brtDayBounds(offsetDays: number) {
  // "Hoje BRT" = momento atual menos 3h, truncado pra meia-noite UTC, depois +3h.
  const nowBrtMs = Date.now() - 3 * 3_600_000;
  const startUtcDay = Math.floor(nowBrtMs / 86_400_000) * 86_400_000;
  const start = startUtcDay + 3 * 3_600_000 + offsetDays * 86_400_000;
  return { start, end: start + 86_400_000 };
}

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
  const [filtro, setFiltro] = useState<Filtro>("Próximos");
  const { data: matches = [], isLoading } = useMatches();
  const { data: quotas = [] } = useMinhasQuotas();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const primeiraQuota = quotas[0];
  const quotaIds = useMemo(() => (quotas as any[]).map((q) => q.id), [quotas]);
  const { data: minhasPreds = [] } = useMyPredictions(primeiraQuota?.id);
  const { data: allPreds = [] } = useAllMyPredictions(quotaIds);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  // Jogo featured: travado_em mais recente que seja <= now()
  const featuredMatchId = useMemo(() => {
    const now = Date.now();
    const candidatos = (matches as any[])
      .filter((m) => m.travado_em && new Date(m.travado_em).getTime() <= now)
      .sort((a, b) => new Date(b.travado_em).getTime() - new Date(a.travado_em).getTime());
    return candidatos[0]?.id ?? null;
  }, [matches]);

  const lista = useMemo(() => {
    const arr = (matches as any[]).slice();
    let filtered = arr;
    if (filtro === "Próximos") {
      filtered = arr
        .filter((j) => j.status === "ao-vivo" || j.status === "agendado")
        .sort((a, b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime())
        .slice(0, 5);
    } else if (filtro === "Hoje") {
      const { start, end } = brtDayBounds(0);
      filtered = arr.filter((j) => {
        const t = new Date(j.data_jogo).getTime();
        return t >= start && t < end;
      });
    } else if (filtro === "Amanhã") {
      const { start, end } = brtDayBounds(1);
      filtered = arr.filter((j) => {
        const t = new Date(j.data_jogo).getTime();
        return t >= start && t < end;
      });
    } else if (filtro === "Esta semana") {
      const { start } = brtDayBounds(0);
      const { end } = brtDayBounds(6);
      filtered = arr.filter((j) => {
        const t = new Date(j.data_jogo).getTime();
        return t >= start && t < end;
      });
    } else if (filtro === "Encerrados") {
      filtered = arr.filter((j) => j.status === "encerrado");
    }
    filtered.sort((a, b) => {
      const ta = new Date(a.data_jogo).getTime();
      const tb = new Date(b.data_jogo).getTime();
      return filtro === "Encerrados" ? tb - ta : ta - tb;
    });
    return filtered;
  }, [matches, filtro]);

  const predMap = new Map((minhasPreds as any[]).map((p) => [p.match_id, p]));

  // Mapa match_id -> palpites por quota (ordenado por número da quota)
  const palpitesPorMatch = useMemo(() => {
    const m = new Map<string, Array<{ quota_numero: number; placar_casa: number | null; placar_fora: number | null }>>();
    for (const p of allPreds as any[]) {
      const arr = m.get(p.match_id) ?? [];
      arr.push({
        quota_numero: p.quota?.numero ?? 0,
        placar_casa: p.placar_casa,
        placar_fora: p.placar_fora,
      });
      m.set(p.match_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.quota_numero - b.quota_numero);
    return m;
  }, [allPreds]);
  const totalQuotas = quotas.length;

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
        filtro === "Próximos" ? (
          <EmptyState
            icon={CalendarSearch}
            title="A Copa acabou, perebada!"
            description="Confere o filtro Encerrados ou as estatísticas no Ranking pra matar saudades."
          />
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title="Nenhum jogo nesse filtro"
            description="Tenta mudar pro filtro de outra janela de tempo — a perebada não palpita no vazio."
          />
        )
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
                  {fmtData(j.data_jogo)} · {fmtHora(j.data_jogo)} ({getUserTimezoneLabel()})
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

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
                  <MeusPalpitesBlock
                    palpites={palpitesPorMatch.get(j.id) ?? []}
                    totalQuotas={totalQuotas}
                    fallbackPred={pred}
                  />
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
                  defaultExpanded={j.id === featuredMatchId}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtPalpite(p: { placar_casa: number | null; placar_fora: number | null }) {
  if (p.placar_casa == null || p.placar_fora == null) return "—";
  return `${p.placar_casa}×${p.placar_fora}`;
}

function MeusPalpitesBlock({
  palpites,
  totalQuotas,
  fallbackPred,
}: {
  palpites: Array<{ quota_numero: number; placar_casa: number | null; placar_fora: number | null }>;
  totalQuotas: number;
  fallbackPred: any;
}) {
  const [open, setOpen] = useState(false);

  // Pereba sem nenhuma quota: comportamento legado
  if (totalQuotas <= 1) {
    const p = palpites[0] ?? (fallbackPred
      ? { quota_numero: 1, placar_casa: fallbackPred.placar_casa, placar_fora: fallbackPred.placar_fora }
      : null);
    return (
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Seu palpite</p>
        <p className="font-display text-base font-bold">
          {p && p.placar_casa != null
            ? `${p.placar_casa} × ${p.placar_fora}`
            : <span className="text-destructive">— sem palpite —</span>}
        </p>
      </div>
    );
  }

  // 2+ quotas: monta lista completa (incluindo "sem palpite" pra quotas sem prediction)
  const byNum = new Map(palpites.map((p) => [p.quota_numero, p]));
  const numeros: number[] = [];
  for (let i = 1; i <= totalQuotas; i++) numeros.push(i);
  const lista = numeros.map((n) => byNum.get(n) ?? { quota_numero: n, placar_casa: null, placar_fora: null });

  const compactInline = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {lista.map((p) => {
        const semPalpite = p.placar_casa == null;
        return (
          <span key={p.quota_numero} className={semPalpite ? "text-destructive" : ""}>
            <span className="text-muted-foreground">#{p.quota_numero}</span>{" "}
            <span className="font-display font-bold">{fmtPalpite(p)}</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Seus palpites</p>
      {/* Até 2 quotas: sempre inline. 3+: inline no desktop, recolhível no mobile */}
      {totalQuotas <= 2 ? (
        <div className="mt-0.5">{compactInline}</div>
      ) : (
        <>
          <div className="mt-0.5 hidden sm:block">{compactInline}</div>
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs font-bold"
            >
              {totalQuotas} quotas
              <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="mt-2">{compactInline}</div>}
          </div>
        </>
      )}
    </div>
  );
}
