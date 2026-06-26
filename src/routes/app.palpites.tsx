import { createFileRoute, Link } from "@tanstack/react-router";
import { getUserTimezoneLabel } from "@/lib/user-timezone";
import { Sparkles, Trophy, Clock, Lock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useMatches } from "@/lib/queries/matches";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyPredictions, useUpsertPrediction } from "@/lib/queries/predictions";
import { useMyTop4, useFaseAtual } from "@/lib/queries/top4";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { Skeleton } from "@/components/ui/skeleton";
import { buildHeader, getTeamSide } from "@/lib/match-helpers";

export const Route = createFileRoute("/app/palpites")({
  head: () => ({ meta: [{ title: "Palpites — Bolão dos Perebas" }] }),
  component: Palpites,
});

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

const TOP4_PESO_BY_FASE: Record<string, number> = {
  antes_copa: 100,
  grupos: 50,
  round_32: 25,
  round_of_32: 25,
};

type EditState = { editing: boolean; casa: string; fora: string };

function isLockedByTime(jogo: any) {
  return (
    jogo.status !== "agendado" ||
    (jogo.travado_em && new Date(jogo.travado_em).getTime() <= Date.now())
  );
}

function isHojeBR(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(new Date());
  const dia = fmt.format(d);
  return today === dia;
}

function placarInvalido(s: string) {
  if (s === "") return false;
  const n = Number(s);
  return Number.isNaN(n) || n < 0 || n > 20;
}

function Palpites() {
  const { data: matches = [], isLoading: loadingM } = useMatches();
  const { data: quotas = [], isLoading: loadingQ } = useMinhasQuotas();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const [quotaId, setQuotaId] = useState<string | undefined>(undefined);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map(stadiums.map((s) => [s.id, s])), [stadiums]);

  useEffect(() => {
    if (!quotaId && quotas.length) setQuotaId(quotas[0].id);
  }, [quotas, quotaId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const matchId = new URLSearchParams(window.location.search).get("match_id");
    if (!matchId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`match-${matchId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [matches]);

  const { data: preds = [] } = useMyPredictions(quotaId);
  const { data: top4 } = useMyTop4(quotaId);
  const { data: faseAtual = "antes_copa" } = useFaseAtual();
  const upsert = useUpsertPrediction();

  const top4Bloqueado = ["oitavas", "quartas", "semis", "final"].includes(faseAtual);
  const top4Peso = TOP4_PESO_BY_FASE[faseAtual] ?? null;
  const top4Preenchido = !!(top4 && top4.posicao_1 && top4.posicao_2 && top4.posicao_3 && top4.posicao_4);

  const abertos = useMemo(
    () =>
      (matches as any[]).filter(
        (m) => m.status === "agendado" && (!m.travado_em || new Date(m.travado_em).getTime() > Date.now()),
      ),
    [matches],
  );

  // Lista visível na página: inclui também os jogos travados (mostrados em read-only).
  const visiveis = useMemo(
    () => (matches as any[]).filter((m) => m.status === "agendado"),
    [matches],
  );

  const encerrados = useMemo(
    () =>
      (matches as any[])
        .filter((m) => m.status === "encerrado")
        .sort(
          (a, b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime(),
        ),
    [matches],
  );

  const [encerradosOpen, setEncerradosOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setEncerradosOpen(localStorage.getItem("palpites_encerrados_expandidos_v1") === "1");
    } catch {
      /* noop */
    }
  }, []);
  const toggleEncerrados = () => {
    setEncerradosOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("palpites_encerrados_expandidos_v1", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };



  const predMap = useMemo(
    () => new Map((preds as any[]).map((p) => [p.match_id, p])),
    [preds],
  );

  // Estado de edição liftado: matchId -> EditState
  const [editStates, setEditStates] = useState<Map<string, EditState>>(new Map());
  const [savingBulk, setSavingBulk] = useState(false);

  // Reset edit states quando troca de quota
  useEffect(() => {
    setEditStates(new Map());
  }, [quotaId]);

  const setCardState = useCallback((matchId: string, partial: Partial<EditState>) => {
    setEditStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(matchId) ?? { editing: false, casa: "", fora: "" };
      next.set(matchId, { ...cur, ...partial });
      return next;
    });
  }, []);

  const startEdit = useCallback(
    (matchId: string) => {
      const pred = predMap.get(matchId);
      setCardState(matchId, {
        editing: true,
        casa: pred?.placar_casa != null ? String(pred.placar_casa) : "",
        fora: pred?.placar_fora != null ? String(pred.placar_fora) : "",
      });
    },
    [predMap, setCardState],
  );

  const cancelEdit = useCallback((matchId: string) => {
    setEditStates((prev) => {
      const next = new Map(prev);
      next.delete(matchId);
      return next;
    });
  }, []);

  // Bulk: filtra cards "abrir" (skip lockedByTime)
  const editaveis = abertos.filter((j) => !isLockedByTime(j));
  const hojeAbertos = editaveis.filter((j) => isHojeBR(j.data_jogo));

  const openAll = (filter: (j: any) => boolean) => {
    setEditStates((prev) => {
      const next = new Map(prev);
      for (const j of editaveis.filter(filter)) {
        if (!next.has(j.id)) {
          const pred = predMap.get(j.id);
          next.set(j.id, {
            editing: true,
            casa: pred?.placar_casa != null ? String(pred.placar_casa) : "",
            fora: pred?.placar_fora != null ? String(pred.placar_fora) : "",
          });
        } else {
          const cur = next.get(j.id)!;
          next.set(j.id, { ...cur, editing: true });
        }
      }
      return next;
    });
  };

  // cards com mudança não-salva
  const dirtyCards = useMemo(() => {
    const out: { jogo: any; state: EditState }[] = [];
    for (const j of abertos) {
      const st = editStates.get(j.id);
      if (!st || !st.editing) continue;
      const pred = predMap.get(j.id);
      const origCasa = pred?.placar_casa != null ? String(pred.placar_casa) : "";
      const origFora = pred?.placar_fora != null ? String(pred.placar_fora) : "";
      if (st.casa !== origCasa || st.fora !== origFora) out.push({ jogo: j, state: st });
    }
    return out;
  }, [editStates, abertos, predMap]);

  const hasDirty = dirtyCards.length > 0;
  const anyEditing = Array.from(editStates.values()).some((s) => s.editing);

  const saveAll = async () => {
    if (!quotaId || dirtyCards.length === 0) return;
    setSavingBulk(true);
    const invalidos: string[] = [];
    const invalidosIds: string[] = [];
    const falhas: string[] = [];
    let salvos = 0;

    const tarefas = dirtyCards.filter(({ jogo, state }) => {
      const inv = placarInvalido(state.casa) || placarInvalido(state.fora);
      if (inv) {
        invalidos.push(jogoLabel(jogo));
        invalidosIds.push(jogo.id);
        return false;
      }
      return true;
    });

    const results = await Promise.allSettled(
      tarefas.map(({ jogo, state }) =>
        upsert.mutateAsync({
          quota_id: quotaId,
          match_id: jogo.id,
          placar_casa: state.casa === "" ? null : Number(state.casa),
          placar_fora: state.fora === "" ? null : Number(state.fora),
        }),
      ),
    );

    results.forEach((r, i) => {
      if (r.status === "fulfilled") salvos += 1;
      else falhas.push(jogoLabel(tarefas[i].jogo));
    });

    // Mantém em modo edição apenas os que falharam ou tinham placar inválido
    setEditStates((prev) => {
      const next = new Map<string, EditState>();
      const failedIds = new Set<string>(
        results
          .map((r, i) => (r.status === "rejected" ? tarefas[i].jogo.id : null))
          .filter((id): id is string => !!id),
      );
      for (const id of [...failedIds, ...invalidosIds]) {
        const s = prev.get(id);
        if (s) next.set(id, s);
      }
      return next;
    });

    setSavingBulk(false);
    const partes: string[] = [];
    if (salvos) partes.push(`${salvos} palpite${salvos > 1 ? "s" : ""} salvo${salvos > 1 ? "s" : ""}`);
    if (falhas.length) partes.push(`${falhas.length} falharam (${falhas.join(", ")})`);
    if (invalidos.length) partes.push(`${invalidos.length} com placar inválido (${invalidos.join(", ")})`);
    if (salvos && !falhas.length && !invalidos.length) toast.success(partes.join(" · "));
    else if (salvos) toast.warning(partes.join(" · "));
    else toast.error(partes.join(" · ") || "Nada salvo.");
  };

  const cancelAll = () => {
    setEditStates(new Map());
  };

  if (loadingM || loadingQ) return <Skeleton className="h-64 w-full" />;

  if (!quotas.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Você ainda não tem quotas"
        description="Compra uma quota pra começar a palpitar, pereba."
      />
    );
  }

  const quotaAtiva = quotas.find((q: any) => q.id === quotaId) ?? quotas[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meus palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quota ativa: <span className="font-semibold text-foreground">Quota #{quotaAtiva.numero}</span>
          </p>
        </div>
        <select
          value={quotaId ?? ""}
          onChange={(e) => setQuotaId(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card"
        >
          {(quotas as any[]).map((q) => (
            <option key={q.id} value={q.id}>Quota #{q.numero}</option>
          ))}
        </select>
      </div>

      {top4Bloqueado ? (
        <div className="flex items-center justify-between rounded-3xl border border-muted-foreground/30 bg-muted/40 p-5 text-muted-foreground shadow-card">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5" />
            <div>
              <p className="font-display font-bold">Palpite do Top 4 travado</p>
              <p className="text-xs">A janela fechou após o Round of 32. Seu palpite atual permanece registrado.</p>
            </div>
          </div>
        </div>
      ) : (
        <Link
          to="/app/palpites/top4"
          className="flex items-center justify-between rounded-3xl border border-accent/40 bg-gold p-5 text-gold-foreground shadow-card transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5" />
            <div>
              <p className="font-display font-bold">
                {top4Preenchido ? "Editar palpite do Top 4" : "Você ainda não palpitou no Top 4!"}
              </p>
              <p className="text-xs">
                Eficácia agora: <strong>{top4Peso ?? 0}%</strong> · vale até 4.000 pontos
              </p>
            </div>
          </div>
          <span className="text-xs font-bold">Abrir →</span>
        </Link>
      )}

      {encerrados.length > 0 && (
        <section className="rounded-2xl border border-border bg-card shadow-card">
          <button
            type="button"
            onClick={toggleEncerrados}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-display text-sm font-extrabold">
              {encerradosOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Jogos encerrados ({encerrados.length})
            </span>
            <span className="text-xs text-muted-foreground">
              {encerradosOpen ? "ocultar" : "ver palpites e pontos"}
            </span>
          </button>
          {encerradosOpen && (
            <div className="space-y-2 border-t border-border p-3">
              {encerrados.map((j: any) => (
                <EncerradoCard
                  key={j.id}
                  jogo={j}
                  pred={predMap.get(j.id)}
                  teamMap={teamMap}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aqui ainda não tem pereba palpitando"
          description="Quando abrir a próxima rodada, é só vir cravar."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-accent/40 bg-secondary p-4">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold">
                {abertos.length > 0
                  ? `Você ainda tem ${abertos.length} jogos abertos para palpitar.`
                  : "Todos os jogos abertos já travaram — abaixo, os palpites salvos por quota (read-only)."}
              </p>
            </div>
          </div>

          {abertos.length > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openAll(() => true)}
                  disabled={editaveis.length === 0 || savingBulk}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-foreground disabled:opacity-50"
                >
                  Editar todos ({editaveis.length})
                </button>
                <button
                  onClick={() => openAll((j) => isHojeBR(j.data_jogo))}
                  disabled={hojeAbertos.length === 0 || savingBulk}
                  title={hojeAbertos.length === 0 ? "Sem jogos hoje" : ""}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-foreground disabled:opacity-50"
                >
                  Editar jogos de hoje ({hojeAbertos.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                {hasDirty && (
                  <span className="hidden text-[11px] font-bold text-accent-foreground sm:inline">
                    {dirtyCards.length} com mudanças não salvas
                  </span>
                )}
                {(hasDirty || anyEditing) && (
                  <button
                    onClick={cancelAll}
                    disabled={savingBulk}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    Cancelar todos
                  </button>
                )}
                {hasDirty && (
                  <button
                    onClick={saveAll}
                    disabled={savingBulk}
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {savingBulk ? "Salvando…" : `Salvar todos (${dirtyCards.length})`}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {visiveis.map((j) => {
              const st = editStates.get(j.id);
              return (
                <PalpiteCard
                  key={j.id}
                  jogo={j}
                  pred={predMap.get(j.id)}
                  quotaId={quotaId!}
                  teamMap={teamMap}
                  stadiumMap={stadiumMap}
                  state={st}
                  onStartEdit={() => startEdit(j.id)}
                  onCancel={() => cancelEdit(j.id)}
                  onChange={(partial) => setCardState(j.id, partial)}
                  onSavedLocal={() => cancelEdit(j.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>

  );
}

function jogoLabel(jogo: any) {
  const a = jogo.casa ?? jogo.slot_casa ?? "?";
  const b = jogo.fora ?? jogo.slot_visitante ?? "?";
  return `${a} × ${b}`;
}

function PalpiteCard({
  jogo,
  pred,
  quotaId,
  teamMap,
  stadiumMap,
  state,
  onStartEdit,
  onCancel,
  onChange,
  onSavedLocal,
}: {
  jogo: any;
  pred: any;
  quotaId: string;
  teamMap: Map<string, any>;
  stadiumMap: Map<string, any>;
  state: EditState | undefined;
  onStartEdit: () => void;
  onCancel: () => void;
  onChange: (partial: Partial<EditState>) => void;
  onSavedLocal: () => void;
}) {
  const upsert = useUpsertPrediction();
  const editing = !!state?.editing;
  const casa = state?.casa ?? (pred?.placar_casa != null ? String(pred.placar_casa) : "");
  const fora = state?.fora ?? (pred?.placar_fora != null ? String(pred.placar_fora) : "");
  const [savedAt, setSavedAt] = useState<Date | null>(pred?.submetido_em ? new Date(pred.submetido_em) : null);

  useEffect(() => {
    if (pred?.submetido_em) setSavedAt(new Date(pred.submetido_em));
  }, [pred?.submetido_em]);

  const trava = travaEm(jogo.travado_em);
  const lockedByTime = isLockedByTime(jogo);
  const tCasa = getTeamSide(jogo.team_home_id, jogo.slot_casa, jogo.casa, teamMap);
  const tFora = getTeamSide(jogo.team_away_id, jogo.slot_visitante, jogo.fora, teamMap);
  const header = buildHeader(jogo, stadiumMap);

  const casaInv = placarInvalido(casa);
  const foraInv = placarInvalido(fora);
  const placarInv = casaInv || foraInv;

  const origCasa = pred?.placar_casa != null ? String(pred.placar_casa) : "";
  const origFora = pred?.placar_fora != null ? String(pred.placar_fora) : "";
  const dirty = editing && (casa !== origCasa || fora !== origFora);

  const salvar = () => {
    if (placarInv) {
      toast.error("Placar deve estar entre 0 e 20");
      return;
    }
    upsert.mutate(
      {
        quota_id: quotaId,
        match_id: jogo.id,
        placar_casa: casa === "" ? null : Number(casa),
        placar_fora: fora === "" ? null : Number(fora),
      },
      {
        onSuccess: () => {
          setSavedAt(new Date());
          onSavedLocal();
          toast.success("Palpite salvo.");
        },
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
      },
    );
  };

  const dataFmt = jogo.data_jogo
    ? new Date(jogo.data_jogo).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <article id={`match-${jogo.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold">{header}</span>
        <span className="flex items-center gap-2">
          {trava && (
            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
              <Clock className="h-3 w-3" /> Trava em {trava}
            </span>
          )}
          peso {jogo.peso}
        </span>
      </div>
      {dataFmt && (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {dataFmt} ({getUserTimezoneLabel()})
        </p>
      )}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <p className="font-display text-sm font-bold sm:text-base text-right">{tCasa.nome}</p>
          <span className="text-2xl sm:text-3xl">{tCasa.bandeira}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreDisplay value={casa} editing={editing} onChange={(v) => onChange({ casa: v })} invalid={casaInv} />
          <span className="text-xl font-bold text-muted-foreground">×</span>
          <ScoreDisplay value={fora} editing={editing} onChange={(v) => onChange({ fora: v })} invalid={foraInv} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl">{tFora.bandeira}</span>
          <p className="font-display text-sm font-bold sm:text-base">{tFora.nome}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-xs">
          {editing && dirty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2 py-1 font-bold text-accent-foreground">
              <AlertCircle className="h-3 w-3" /> Alterações não salvas
            </span>
          )}
          {!editing && savedAt && (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Palpite salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {!editing && !savedAt && (
            <span className="text-muted-foreground">Sem palpite</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={onCancel}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                disabled={upsert.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={upsert.isPending || lockedByTime || placarInv}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {upsert.isPending ? "Salvando…" : "Salvar palpite"}
              </button>
            </>
          ) : lockedByTime ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-4 py-2 text-xs font-bold text-muted-foreground"
              title="Janela de palpite encerrada (5 min antes do apito)"
            >
              <Lock className="h-3 w-3" /> Palpite travado
            </span>
          ) : (
            <button
              onClick={onStartEdit}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Editar
            </button>
          )}

        </div>
      </div>
      {editing && placarInv && (
        <p className="mt-2 text-right text-[11px] font-bold text-destructive">Placar deve estar entre 0 e 20</p>
      )}
    </article>
  );
}

function ScoreDisplay({ value, editing, onChange, invalid }: { value: string; editing: boolean; onChange: (v: string) => void; invalid?: boolean }) {
  if (editing) {
    return (
      <input
        type="number"
        min={0}
        max={20}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="-"
        className={`h-14 w-14 rounded-2xl border bg-secondary text-center font-display text-2xl font-black focus:outline-none focus:ring-2 ${
          invalid ? "border-destructive focus:border-destructive focus:ring-destructive/30" : "border-border focus:border-primary focus:ring-primary/30"
        }`}
      />
    );
  }
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 font-display text-2xl font-black text-foreground">
      {value === "" ? "—" : value}
    </div>
  );
}

function EncerradoCard({
  jogo,
  pred,
  teamMap,
}: {
  jogo: any;
  pred: any;
  teamMap: Map<string, any>;
}) {
  const tCasa = getTeamSide(jogo.team_home_id, jogo.slot_casa, jogo.casa, teamMap);
  const tFora = getTeamSide(jogo.team_away_id, jogo.slot_visitante, jogo.fora, teamMap);
  const dataFmt = jogo.data_jogo
    ? new Date(jogo.data_jogo).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  return (
    <article className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-semibold">
          {dataFmt} {jogo.fase ? `· ${jogo.fase}` : ""}
        </span>
        <span>peso {jogo.peso}</span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center justify-end gap-2">
          <p className="truncate text-right text-sm font-bold">{tCasa.nome}</p>
          <span className="text-xl">{tCasa.bandeira}</span>
        </div>
        <div className="text-center font-display text-lg font-black">
          {jogo.placar_casa != null && jogo.placar_fora != null
            ? `${jogo.placar_casa} × ${jogo.placar_fora}`
            : "—"}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{tFora.bandeira}</span>
          <p className="truncate text-sm font-bold">{tFora.nome}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/60 p-2 text-xs">
        <div>
          <span className="text-muted-foreground">Seu palpite: </span>
          <span className="font-display font-bold">
            {pred && pred.placar_casa != null && pred.placar_fora != null
              ? `${pred.placar_casa} × ${pred.placar_fora}`
              : "— sem palpite —"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            <span className="text-muted-foreground">Pontos: </span>
            <span className="font-bold">{pred?.pontos_calculados != null ? pred.pontos_calculados : "—"}</span>
          </span>
          <Link
            to="/app/jogo/$match_id/detalhes"
            params={{ match_id: jogo.id }}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <BarChart3 className="h-3 w-3" /> Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
