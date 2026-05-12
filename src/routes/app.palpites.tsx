import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Trophy, Clock, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  const predMap = new Map((preds as any[]).map((p) => [p.match_id, p]));

  if (loadingM || loadingQ) return <Skeleton className="h-64 w-full" />;

  if (!quotas.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Você ainda não tem quotas"
        description="Compra uma quota pra começar a palpitar, peraba."
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

      {abertos.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aqui ainda não tem peraba palpitando"
          description="Quando abrir a próxima rodada, é só vir cravar."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-accent/40 bg-secondary p-4">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold">Você ainda tem {abertos.length} jogos abertos para palpitar.</p>
            </div>
          </div>

          <div className="space-y-3">
            {abertos.map((j) => (
              <PalpiteCard
                key={j.id}
                jogo={j}
                pred={predMap.get(j.id)}
                quotaId={quotaId!}
                teamMap={teamMap}
                stadiumMap={stadiumMap}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PalpiteCard({
  jogo,
  pred,
  quotaId,
  teamMap,
  stadiumMap,
}: {
  jogo: any;
  pred: any;
  quotaId: string;
  teamMap: Map<string, any>;
  stadiumMap: Map<string, any>;
}) {
  const upsert = useUpsertPrediction();
  const [editing, setEditing] = useState(false);
  const [casa, setCasa] = useState<string>(pred?.placar_casa != null ? String(pred.placar_casa) : "");
  const [fora, setFora] = useState<string>(pred?.placar_fora != null ? String(pred.placar_fora) : "");
  const [savedAt, setSavedAt] = useState<Date | null>(pred?.submetido_em ? new Date(pred.submetido_em) : null);

  useEffect(() => {
    if (!editing) {
      setCasa(pred?.placar_casa != null ? String(pred.placar_casa) : "");
      setFora(pred?.placar_fora != null ? String(pred.placar_fora) : "");
      if (pred?.submetido_em) setSavedAt(new Date(pred.submetido_em));
    }
  }, [pred, editing]);

  const trava = travaEm(jogo.travado_em);
  const lockedByTime = jogo.status !== "agendado" || (jogo.travado_em && new Date(jogo.travado_em).getTime() <= Date.now());
  const tCasa = getTeamSide(jogo.team_home_id, jogo.slot_casa, jogo.casa, teamMap);
  const tFora = getTeamSide(jogo.team_away_id, jogo.slot_visitante, jogo.fora, teamMap);
  const header = buildHeader(jogo, stadiumMap);

  const casaNum = casa === "" ? null : Number(casa);
  const foraNum = fora === "" ? null : Number(fora);
  const casaInvalido = casaNum != null && (Number.isNaN(casaNum) || casaNum < 0 || casaNum > 20);
  const foraInvalido = foraNum != null && (Number.isNaN(foraNum) || foraNum < 0 || foraNum > 20);
  const placarInvalido = casaInvalido || foraInvalido;

  const dirty =
    editing &&
    (casa !== (pred?.placar_casa != null ? String(pred.placar_casa) : "") ||
      fora !== (pred?.placar_fora != null ? String(pred.placar_fora) : ""));

  const salvar = () => {
    if (placarInvalido) {
      toast.error("Placar deve estar entre 0 e 20");
      return;
    }
    const placar_casa = casaNum;
    const placar_fora = foraNum;
    upsert.mutate(
      { quota_id: quotaId, match_id: jogo.id, placar_casa, placar_fora },
      {
        onSuccess: () => {
          setSavedAt(new Date());
          setEditing(false);
          toast.success("Palpite salvo.");
        },
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
      },
    );
  };

  const cancelar = () => {
    setCasa(pred?.placar_casa != null ? String(pred.placar_casa) : "");
    setFora(pred?.placar_fora != null ? String(pred.placar_fora) : "");
    setEditing(false);
  };

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
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <p className="hidden font-display font-bold sm:block">{tCasa.nome}</p>
          <span className="text-3xl">{tCasa.bandeira}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreDisplay value={casa} editing={editing} onChange={setCasa} invalid={casaInvalido} />
          <span className="text-xl font-bold text-muted-foreground">×</span>
          <ScoreDisplay value={fora} editing={editing} onChange={setFora} invalid={foraInvalido} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tFora.bandeira}</span>
          <p className="hidden font-display font-bold sm:block">{tFora.nome}</p>
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
                onClick={cancelar}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                disabled={upsert.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={upsert.isPending || lockedByTime || placarInvalido}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {upsert.isPending ? "Salvando…" : "Salvar palpite"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              disabled={lockedByTime}
              title={lockedByTime ? "Palpites encerrados para este jogo" : ""}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {lockedByTime ? "Travado" : "Editar"}
            </button>
          )}
        </div>
      </div>
      {editing && placarInvalido && (
        <p className="mt-2 text-right text-[11px] font-bold text-destructive">Placar deve estar entre 0 e 20</p>
      )}
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              disabled={lockedByTime}
              title={lockedByTime ? "Palpites encerrados para este jogo" : ""}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {lockedByTime ? "Travado" : "Editar"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ScoreDisplay({ value, editing, onChange }: { value: string; editing: boolean; onChange: (v: string) => void }) {
  if (editing) {
    return (
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="-"
        className="h-14 w-14 rounded-2xl border border-border bg-secondary text-center font-display text-2xl font-black focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    );
  }
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 font-display text-2xl font-black text-foreground">
      {value === "" ? "—" : value}
    </div>
  );
}
