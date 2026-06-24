import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, RotateCcw, Trophy, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { useSimMatches, useFifaRanking, useAnnexeC } from "@/lib/simulador/data";
import {
  GRUPOS,
  calcularClassificacaoGrupo,
  calcularR32,
  calcularMelhores3os,
  determinarFaseInicial,
  getVencedor,
  getPerdedor,
  resolveOrigem,
  type SimMatch,
  type PalpiteGrupo,
  type PalpiteMataMata,
  type ClassLinha,
} from "@/lib/simulador/engine";

export const Route = createFileRoute("/app/simulador")({
  head: () => ({ meta: [{ title: "Simulador da Copa — Bolão dos Perebas" }] }),
  component: SimuladorPage,
});

type Fase = "grupos" | "r32" | "oitavas" | "quartas" | "semis" | "final" | "resultado" | "copa_encerrada";

const FAIXAS_MATA_MATA: Record<Exclude<Fase, "grupos" | "resultado" | "copa_encerrada">, [number, number]> = {
  r32: [73, 88],
  oitavas: [89, 96],
  quartas: [97, 100],
  semis: [101, 102],
  final: [103, 104], // 103 = 3º lugar, 104 = final
};

const FASE_LABEL: Record<Fase, string> = {
  grupos: "Fase de Grupos",
  r32: "Round of 32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semis: "Semifinais",
  final: "Final + 3º Lugar",
  resultado: "Resultado",
  copa_encerrada: "Copa encerrada",
};

const FASE_ORDEM: Fase[] = ["grupos", "r32", "oitavas", "quartas", "semis", "final", "resultado"];

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SimuladorPage() {
  const { data: matches, isLoading: lm } = useSimMatches();
  const { data: teams = [], isLoading: lt } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const { data: fifa = {} } = useFifaRanking();
  const { data: annexe = [] } = useAnnexeC();

  const loading = lm || lt;
  if (loading || !matches) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <SimuladorInner
      matches={matches as SimMatch[]}
      teams={teams}
      stadiums={stadiums}
      fifa={fifa}
      annexe={annexe}
    />
  );
}

function SimuladorInner({
  matches,
  teams,
  stadiums,
  fifa,
  annexe,
}: {
  matches: SimMatch[];
  teams: any[];
  stadiums: any[];
  fifa: Record<string, number>;
  annexe: any[];
}) {
  const faseInicial = useMemo(() => determinarFaseInicial(matches) as Fase, [matches]);
  const [fase, setFase] = useState<Fase>(faseInicial);
  const [palpitesGrupos, setPalpitesGrupos] = useState<Record<number, PalpiteGrupo>>({});
  const [palpitesMM, setPalpitesMM] = useState<Record<number, PalpiteMataMata>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Re-sync fase inicial se matches mudar (raro)
  useEffect(() => {
    setFase(faseInicial);
  }, [faseInicial]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);
  const jogosMap = useMemo(() => new Map(matches.map((m) => [m.numero_jogo, m])), [matches]);

  const timesPorGrupo = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const t of teams) (g[t.grupo] ||= []).push(t);
    return g;
  }, [teams]);

  // Classificações de todos os grupos (recalcula a cada mudança)
  const classificacoes = useMemo(() => {
    const out: Record<string, ClassLinha[]> = {};
    for (const g of GRUPOS) {
      const jogosGrupo = matches.filter(
        (m) => m.numero_jogo <= 72 && (timesPorGrupo[g] ?? []).some((t) => t.id === m.team_home_id || t.id === m.team_away_id),
      );
      out[g] = calcularClassificacaoGrupo(
        g,
        jogosGrupo,
        palpitesGrupos,
        timesPorGrupo[g] ?? [],
        fifa,
      );
    }
    return out;
  }, [matches, palpitesGrupos, timesPorGrupo, fifa]);

  // R32 pairings calculated from classificações
  const r32Pairings = useMemo(() => {
    return calcularR32(classificacoes, annexe, fifa);
  }, [classificacoes, annexe, fifa]);

  // Resolved teams para todos os jogos de mata-mata (R32 + pós-R32)
  const resolvedMM = useMemo(() => {
    const map = new Map<number, { home_id: string | null; away_id: string | null }>();
    // R32
    for (const [n, p] of Object.entries(r32Pairings)) {
      map.set(Number(n), { home_id: p.home_id, away_id: p.away_id });
    }
    // Pós-R32 (89-104) — depende dos vencedores anteriores
    for (let n = 89; n <= 104; n++) {
      const m = jogosMap.get(n);
      if (!m) continue;
      const home_id =
        m.status === "encerrado"
          ? m.team_home_id
          : resolveOrigem(m.home_origem, jogosMap, map, palpitesMM);
      const away_id =
        m.status === "encerrado"
          ? m.team_away_id
          : resolveOrigem(m.away_origem, jogosMap, map, palpitesMM);
      map.set(n, { home_id, away_id });
    }
    return map;
  }, [r32Pairings, jogosMap, palpitesMM]);

  const setPalpiteG = (n: number, casa: number, fora: number) => {
    setPalpitesGrupos((prev) => ({ ...prev, [n]: { placar_casa: casa, placar_fora: fora } }));
  };
  const setPalpiteMM = (n: number, patch: Partial<PalpiteMataMata>) => {
    setPalpitesMM((prev) => ({
      ...prev,
      [n]: { placar_casa: 0, placar_fora: 0, ...(prev[n] ?? {}), ...patch },
    }));
  };

  const resetTudo = () => {
    setPalpitesGrupos({});
    setPalpitesMM({});
    setFase(faseInicial);
  };

  const teamNome = (id: string | null | undefined, fallback?: string) => {
    if (!id) return fallback ?? "Aguardando";
    const t = teamMap.get(id) as any;
    return t ? `${t.bandeira_emoji} ${t.nome_pt}` : (fallback ?? "?");
  };

  // --- Validações por fase
  const jogosGruposPendentes = useMemo(() => {
    return matches.filter(
      (m) => m.numero_jogo <= 72 && m.status !== "encerrado" && !palpitesGrupos[m.numero_jogo],
    );
  }, [matches, palpitesGrupos]);

  const validarFaseMM = (lo: number, hi: number) => {
    for (let n = lo; n <= hi; n++) {
      const m = jogosMap.get(n);
      if (!m) continue;
      if (m.status === "encerrado") continue;
      const p = palpitesMM[n];
      if (!p) return false;
      if (p.placar_casa === p.placar_fora && !p.vencedor_id) return false;
    }
    return true;
  };

  // --- Renderização

  if (fase === "copa_encerrada") {
    return (
      <div className="mx-auto grid max-w-md place-items-center py-20 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-secondary text-4xl">
          🏆
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold">A Copa já terminou</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Confere quem ganhou em{" "}
          <Link to="/app" className="underline">
            Início
          </Link>{" "}
          e revê todos os jogos em{" "}
          <Link to="/app/jogos" className="underline">
            Jogos
          </Link>
          . Quando vier a próxima edição, o simulador volta a funcionar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-32">
      <header className="space-y-3" data-no-print>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Simulador da Copa</h1>
            <p className="text-sm text-muted-foreground">
              Brinque de simular o que falta da Copa. Nada do que você digitar aqui afeta seus
              palpites ou a pontuação do bolão.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmReset(true)}
            title="Recomeçar simulação"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Recomeçar</span>
          </Button>
        </div>
        <StepBar fase={fase} faseInicial={faseInicial} />
      </header>

      {fase === "grupos" && (
        <FaseGrupos
          matches={matches}
          timesPorGrupo={timesPorGrupo}
          classificacoes={classificacoes}
          palpitesGrupos={palpitesGrupos}
          setPalpite={setPalpiteG}
          teamMap={teamMap}
          stadiumMap={stadiumMap}
          onLimpar={() => setConfirmClear(true)}
          onAvancar={() => setFase("r32")}
          pendentes={jogosGruposPendentes.length}
        />
      )}

      {(fase === "r32" || fase === "oitavas" || fase === "quartas" || fase === "semis") && (
        <FaseMataMata
          fase={fase}
          faixa={FAIXAS_MATA_MATA[fase]}
          matches={matches}
          jogosMap={jogosMap}
          resolvedMM={resolvedMM}
          palpitesMM={palpitesMM}
          setPalpite={setPalpiteMM}
          teamNome={teamNome}
          stadiumMap={stadiumMap}
          onAvancar={() => {
            const idx = FASE_ORDEM.indexOf(fase);
            setFase(FASE_ORDEM[idx + 1]);
          }}
          podeAvancar={validarFaseMM(...FAIXAS_MATA_MATA[fase])}
          onLimparFase={() => {
            const [lo, hi] = FAIXAS_MATA_MATA[fase];
            setPalpitesMM((prev) => {
              const next = { ...prev };
              for (let n = lo; n <= hi; n++) delete next[n];
              return next;
            });
          }}
        />
      )}

      {fase === "final" && (
        <FaseFinal
          matches={matches}
          jogosMap={jogosMap}
          resolvedMM={resolvedMM}
          palpitesMM={palpitesMM}
          setPalpite={setPalpiteMM}
          teamNome={teamNome}
          stadiumMap={stadiumMap}
          onConcluir={() => setFase("resultado")}
          podeAvancar={validarFaseMM(103, 104)}
        />
      )}

      {fase === "resultado" && (
        <FaseResultado
          matches={matches}
          jogosMap={jogosMap}
          resolvedMM={resolvedMM}
          palpitesMM={palpitesMM}
          palpitesGrupos={palpitesGrupos}
          classificacoes={classificacoes}
          fifa={fifa}
          teamNome={teamNome}
          onRecomecar={() => setConfirmReset(true)}
        />
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Recomeçar simulação?"
        description="Todos os placares simulados serão apagados. Esta ação não pode ser desfeita."
        confirmLabel="Recomeçar"
        destructive
        onConfirm={() => {
          resetTudo();
          setConfirmReset(false);
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpar fase?"
        description="Apaga os placares simulados da fase atual."
        confirmLabel="Limpar"
        destructive
        onConfirm={() => {
          if (fase === "grupos") setPalpitesGrupos({});
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

// ---------- Step bar ----------

function StepBar({ fase, faseInicial }: { fase: Fase; faseInicial: Fase }) {
  const idx = FASE_ORDEM.indexOf(fase);
  const inicialIdx = FASE_ORDEM.indexOf(faseInicial);
  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {FASE_ORDEM.map((f, i) => {
        const isCurrent = i === idx;
        const isPast = i < idx;
        const isLockedReal = i < inicialIdx; // antes da fase inicial = já decidido pela Copa real
        return (
          <div
            key={f}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
              isCurrent
                ? "bg-primary text-primary-foreground"
                : isPast
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {isLockedReal && <Lock className="h-3 w-3" />}
            <span>{FASE_LABEL[f]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Fase Grupos ----------

function FaseGrupos({
  matches,
  timesPorGrupo,
  classificacoes,
  palpitesGrupos,
  setPalpite,
  teamMap,
  stadiumMap,
  onLimpar,
  onAvancar,
  pendentes,
}: {
  matches: SimMatch[];
  timesPorGrupo: Record<string, any[]>;
  classificacoes: Record<string, ClassLinha[]>;
  palpitesGrupos: Record<number, PalpiteGrupo>;
  setPalpite: (n: number, casa: number, fora: number) => void;
  teamMap: Map<string, any>;
  stadiumMap: Map<string, any>;
  onLimpar: () => void;
  onAvancar: () => void;
  pendentes: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between" data-no-print>
        <h2 className="font-display text-lg font-bold">Fase de Grupos</h2>
        <Button size="sm" variant="ghost" onClick={onLimpar}>
          Limpar fase
        </Button>
      </div>

      {GRUPOS.map((g) => {
        const times = timesPorGrupo[g] ?? [];
        const jogosGrupo = matches.filter(
          (m) =>
            m.numero_jogo <= 72 &&
            times.some((t) => t.id === m.team_home_id || t.id === m.team_away_id),
        );
        const futuros = jogosGrupo.filter((m) => m.status !== "encerrado");
        if (futuros.length === 0) return null; // grupo já encerrou
        const tabela = classificacoes[g] ?? [];
        return (
          <Card key={g} className="overflow-hidden">
            <div className="border-b bg-muted/50 px-4 py-2 font-semibold">Grupo {g}</div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Jogos a simular
                </div>
                {futuros.map((m) => (
                  <JogoGrupoRow
                    key={m.numero_jogo}
                    m={m}
                    palpite={palpitesGrupos[m.numero_jogo]}
                    setPalpite={(c, f) => setPalpite(m.numero_jogo, c, f)}
                    teamMap={teamMap}
                    stadiumMap={stadiumMap}
                  />
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Classificação (ao vivo)
                </div>
                <table className="mt-2 w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 text-left">#</th>
                      <th className="text-left">Time</th>
                      <th>P</th>
                      <th>J</th>
                      <th>SG</th>
                      <th>GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.map((l, i) => {
                      const t = teamMap.get(l.team_id);
                      return (
                        <tr key={l.team_id} className={i < 2 ? "font-semibold" : ""}>
                          <td className="py-1">{i + 1}</td>
                          <td>
                            {t ? `${t.bandeira_emoji} ${t.nome_pt}` : "?"}
                          </td>
                          <td className="text-center">{l.pontos}</td>
                          <td className="text-center">{l.jogos}</td>
                          <td className="text-center">{l.sg}</td>
                          <td className="text-center">{l.gp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="sticky bottom-2 z-10 flex justify-end" data-no-print>
        <Button
          size="lg"
          onClick={onAvancar}
          disabled={pendentes > 0}
          title={pendentes > 0 ? `Faltam ${pendentes} jogos pra simular` : ""}
        >
          Próxima fase: Round of 32
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function JogoGrupoRow({
  m,
  palpite,
  setPalpite,
  teamMap,
  stadiumMap,
}: {
  m: SimMatch;
  palpite?: PalpiteGrupo;
  setPalpite: (c: number, f: number) => void;
  teamMap: Map<string, any>;
  stadiumMap: Map<string, any>;
}) {
  const home = m.team_home_id ? teamMap.get(m.team_home_id) : null;
  const away = m.team_away_id ? teamMap.get(m.team_away_id) : null;
  const st = m.stadium_id ? stadiumMap.get(m.stadium_id) : null;
  return (
    <div className="rounded-lg border p-2">
      <div className="text-xs text-muted-foreground">
        Jogo {m.numero_jogo} · {fmtData(m.data_jogo)}
        {st ? ` · ${st.nome}` : ""}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 text-right text-sm">
          {home ? `${home.bandeira_emoji} ${home.nome_pt}` : (m.casa ?? "?")}
        </div>
        <Input
          type="number"
          min={0}
          max={20}
          className="h-8 w-12 text-center"
          value={palpite?.placar_casa ?? ""}
          onChange={(e) => {
            const v = Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0));
            setPalpite(v, palpite?.placar_fora ?? 0);
          }}
        />
        <span className="text-muted-foreground">×</span>
        <Input
          type="number"
          min={0}
          max={20}
          className="h-8 w-12 text-center"
          value={palpite?.placar_fora ?? ""}
          onChange={(e) => {
            const v = Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0));
            setPalpite(palpite?.placar_casa ?? 0, v);
          }}
        />
        <div className="flex-1 text-left text-sm">
          {away ? `${away.bandeira_emoji} ${away.nome_pt}` : (m.fora ?? "?")}
        </div>
      </div>
    </div>
  );
}

// ---------- Fase Mata-Mata genérica ----------

function FaseMataMata({
  fase,
  faixa,
  matches,
  jogosMap,
  resolvedMM,
  palpitesMM,
  setPalpite,
  teamNome,
  stadiumMap,
  onAvancar,
  podeAvancar,
  onLimparFase,
}: {
  fase: Fase;
  faixa: [number, number];
  matches: SimMatch[];
  jogosMap: Map<number, SimMatch>;
  resolvedMM: Map<number, { home_id: string | null; away_id: string | null }>;
  palpitesMM: Record<number, PalpiteMataMata>;
  setPalpite: (n: number, patch: Partial<PalpiteMataMata>) => void;
  teamNome: (id: string | null | undefined, fallback?: string) => string;
  stadiumMap: Map<string, any>;
  onAvancar: () => void;
  podeAvancar: boolean;
  onLimparFase: () => void;
}) {
  const [lo, hi] = faixa;
  const jogos = matches.filter((m) => m.numero_jogo >= lo && m.numero_jogo <= hi);
  const proxFaseLabel: Record<Fase, string> = {
    r32: "Oitavas",
    oitavas: "Quartas",
    quartas: "Semifinais",
    semis: "Final + 3º",
    grupos: "",
    final: "",
    resultado: "",
    copa_encerrada: "",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between" data-no-print>
        <h2 className="font-display text-lg font-bold">{FASE_LABEL[fase]}</h2>
        <Button size="sm" variant="ghost" onClick={onLimparFase}>
          Limpar fase
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {jogos.map((m) => (
          <JogoMMRow
            key={m.numero_jogo}
            m={m}
            resolved={resolvedMM.get(m.numero_jogo)}
            palpite={palpitesMM[m.numero_jogo]}
            setPalpite={(patch) => setPalpite(m.numero_jogo, patch)}
            teamNome={teamNome}
            stadiumMap={stadiumMap}
          />
        ))}
      </div>

      <div className="sticky bottom-2 z-10 flex justify-end" data-no-print>
        <Button size="lg" onClick={onAvancar} disabled={!podeAvancar}>
          Próxima fase: {proxFaseLabel[fase]}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function fmtOrigemLabel(origem: string | null | undefined): string {
  if (!origem) return "";
  if (origem.startsWith("V")) return `Vencedor Jogo ${origem.slice(1)}`;
  if (origem.startsWith("P")) return `Perdedor Jogo ${origem.slice(1)}`;
  if (/^[123][A-L]$/.test(origem)) {
    const pos = origem[0];
    const grp = origem.slice(1);
    const lbl: Record<string, string> = { "1": "1º", "2": "2º", "3": "3º" };
    return `${lbl[pos]} Grupo ${grp}`;
  }
  return origem;
}

function JogoMMRow({
  m,
  resolved,
  palpite,
  setPalpite,
  teamNome,
  stadiumMap,
}: {
  m: SimMatch;
  resolved?: { home_id: string | null; away_id: string | null };
  palpite?: PalpiteMataMata;
  setPalpite: (patch: Partial<PalpiteMataMata>) => void;
  teamNome: (id: string | null | undefined, fallback?: string) => string;
  stadiumMap: Map<string, any>;
}) {
  const st = m.stadium_id ? stadiumMap.get(m.stadium_id) : null;
  const encerrado = m.status === "encerrado";
  const home_id = encerrado ? m.team_home_id : (resolved?.home_id ?? null);
  const away_id = encerrado ? m.team_away_id : (resolved?.away_id ?? null);
  const empate = !!palpite && palpite.placar_casa === palpite.placar_fora;

  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">
        Jogo {m.numero_jogo} · {fmtData(m.data_jogo)}
        {st ? ` · ${st.nome}` : ""}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          <div className="text-sm font-medium">{teamNome(home_id, m.casa)}</div>
          <div className="text-[10px] text-muted-foreground">{fmtOrigemLabel(m.home_origem)}</div>
        </div>
        {encerrado ? (
          <div className="flex items-center gap-1 text-sm font-bold">
            <span>{m.placar_casa}</span>
            <span className="text-muted-foreground">×</span>
            <span>{m.placar_fora}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={20}
              className="h-8 w-12 text-center"
              value={palpite?.placar_casa ?? ""}
              onChange={(e) => {
                const v = Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0));
                setPalpite({ placar_casa: v, placar_fora: palpite?.placar_fora ?? 0 });
              }}
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              min={0}
              max={20}
              className="h-8 w-12 text-center"
              value={palpite?.placar_fora ?? ""}
              onChange={(e) => {
                const v = Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0));
                setPalpite({ placar_casa: palpite?.placar_casa ?? 0, placar_fora: v });
              }}
            />
          </div>
        )}
        <div className="text-left">
          <div className="text-sm font-medium">{teamNome(away_id, m.fora)}</div>
          <div className="text-[10px] text-muted-foreground">{fmtOrigemLabel(m.away_origem)}</div>
        </div>
      </div>

      {!encerrado && empate && home_id && away_id && (
        <div className="mt-2">
          <div className="text-xs text-muted-foreground">Quem passa?</div>
          <Select
            value={palpite?.vencedor_id ?? ""}
            onValueChange={(v) => setPalpite({ vencedor_id: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={home_id}>{teamNome(home_id)}</SelectItem>
              <SelectItem value={away_id}>{teamNome(away_id)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {encerrado && (
        <div className="mt-1 text-[10px] text-muted-foreground">🔒 Resultado real</div>
      )}
    </Card>
  );
}

// ---------- Final + 3º ----------

function FaseFinal(props: {
  matches: SimMatch[];
  jogosMap: Map<number, SimMatch>;
  resolvedMM: Map<number, { home_id: string | null; away_id: string | null }>;
  palpitesMM: Record<number, PalpiteMataMata>;
  setPalpite: (n: number, patch: Partial<PalpiteMataMata>) => void;
  teamNome: (id: string | null | undefined, fallback?: string) => string;
  stadiumMap: Map<string, any>;
  onConcluir: () => void;
  podeAvancar: boolean;
}) {
  const jogos = props.matches.filter((m) => m.numero_jogo === 103 || m.numero_jogo === 104);
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold" data-no-print>
        Final + Disputa de 3º Lugar
      </h2>
      <div className="grid gap-3">
        {jogos.map((m) => (
          <JogoMMRow
            key={m.numero_jogo}
            m={m}
            resolved={props.resolvedMM.get(m.numero_jogo)}
            palpite={props.palpitesMM[m.numero_jogo]}
            setPalpite={(patch) => props.setPalpite(m.numero_jogo, patch)}
            teamNome={props.teamNome}
            stadiumMap={props.stadiumMap}
          />
        ))}
      </div>
      <div className="sticky bottom-2 z-10 flex justify-end" data-no-print>
        <Button size="lg" onClick={props.onConcluir} disabled={!props.podeAvancar}>
          Concluir simulação
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- Resultado ----------

function FaseResultado({
  matches,
  jogosMap,
  resolvedMM,
  palpitesMM,
  palpitesGrupos,
  classificacoes,
  fifa,
  teamNome,
  onRecomecar,
}: {
  matches: SimMatch[];
  jogosMap: Map<number, SimMatch>;
  resolvedMM: Map<number, { home_id: string | null; away_id: string | null }>;
  palpitesMM: Record<number, PalpiteMataMata>;
  palpitesGrupos: Record<number, PalpiteGrupo>;
  classificacoes: Record<string, ClassLinha[]>;
  fifa: Record<string, number>;
  teamNome: (id: string | null | undefined, fallback?: string) => string;
  onRecomecar: () => void;
}) {
  const finalMatch = jogosMap.get(104);
  const tercMatch = jogosMap.get(103);
  const campeao = finalMatch
    ? getVencedor(104, jogosMap, resolvedMM, palpitesMM)
    : null;
  const vice = finalMatch ? getPerdedor(104, jogosMap, resolvedMM, palpitesMM) : null;
  const terceiro = tercMatch ? getVencedor(103, jogosMap, resolvedMM, palpitesMM) : null;
  const quarto = tercMatch ? getPerdedor(103, jogosMap, resolvedMM, palpitesMM) : null;

  const melhores3os = calcularMelhores3os(classificacoes, fifa);

  const resumoFases: { titulo: string; faixa: [number, number] }[] = [
    { titulo: "Round of 32", faixa: [73, 88] },
    { titulo: "Oitavas", faixa: [89, 96] },
    { titulo: "Quartas", faixa: [97, 100] },
    { titulo: "Semifinais", faixa: [101, 102] },
    { titulo: "Disputa de 3º + Final", faixa: [103, 104] },
  ];

  const placarDe = (n: number) => {
    const m = jogosMap.get(n);
    if (!m) return "";
    if (m.status === "encerrado") {
      return ` ${m.placar_casa}-${m.placar_fora} `;
    }
    const p = palpitesMM[n];
    if (!p) return " ?-? ";
    return ` ${p.placar_casa}-${p.placar_fora} `;
  };

  return (
    <div className="simulador-resultado space-y-6">
      <Card className="hero-campeoes border-2 p-6">
        <div className="flex items-center gap-2" data-no-print={false}>
          <Trophy className="h-6 w-6 text-amber-500" />
          <h2 className="font-display text-xl font-extrabold">Na sua simulação...</h2>
        </div>
        <div className="mt-4 grid gap-2 text-lg">
          <div>🥇 <span className="font-semibold">Campeão:</span> {teamNome(campeao)}</div>
          <div>🥈 <span className="font-semibold">Vice-campeão:</span> {teamNome(vice)}</div>
          <div>🥉 <span className="font-semibold">3º lugar:</span> {teamNome(terceiro)}</div>
          <div>🏅 <span className="font-semibold">4º lugar:</span> {teamNome(quarto)}</div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-display text-base font-bold">Fase de Grupos</h3>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {GRUPOS.map((g) => {
            const t = classificacoes[g] ?? [];
            return (
              <div key={g}>
                <span className="font-semibold">Grupo {g}:</span>{" "}
                {t.map((l, i) => `${i + 1}º ${teamNome(l.team_id)}`).join(" · ")}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-sm">
          <span className="font-semibold">8 melhores 3ºs:</span>{" "}
          {melhores3os.ordenados
            .slice(0, 8)
            .map((t) => `${teamNome(t.linha.team_id)} (${t.grupo})`)
            .join(" · ")}
        </div>
      </Card>

      {resumoFases.map((r) => {
        const jogos = matches.filter(
          (m) => m.numero_jogo >= r.faixa[0] && m.numero_jogo <= r.faixa[1],
        );
        return (
          <Card key={r.titulo} className="p-4">
            <h3 className="font-display text-base font-bold">{r.titulo}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {jogos.map((m) => {
                const resolved = resolvedMM.get(m.numero_jogo);
                const home_id =
                  m.status === "encerrado" ? m.team_home_id : (resolved?.home_id ?? null);
                const away_id =
                  m.status === "encerrado" ? m.team_away_id : (resolved?.away_id ?? null);
                return (
                  <li key={m.numero_jogo}>
                    {m.status === "encerrado" && "🔒 "}
                    M{m.numero_jogo}: {teamNome(home_id, m.casa)}
                    {placarDe(m.numero_jogo)}
                    {teamNome(away_id, m.fora)}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <div className="flex flex-wrap justify-end gap-2" data-no-print>
        <Button variant="outline" onClick={onRecomecar}>
          <RotateCcw className="h-4 w-4" /> Recomeçar simulação
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  );
}
