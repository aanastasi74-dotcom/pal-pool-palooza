import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { ArrowLeft, Share2, Gift, Sparkles, Trophy, TrendingUp, Target, Zap, Quote, Loader2 } from "lucide-react";
import { useWrapped, type WrappedData } from "@/lib/queries/wrapped";
import { useTeams, type Team } from "@/lib/queries/teams";

export const Route = createFileRoute("/app/wrapped")({
  head: () => ({ meta: [{ title: "Seu Wrapped — Bolão dos Perebas" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    u: typeof s.u === "string" && s.u.length > 0 ? s.u : undefined,
  }),
  component: WrappedPage,
});

function WrappedPage() {
  const navigate = useNavigate();
  const { u: previewUserId } = Route.useSearch();
  const { data: result, isLoading } = useWrapped(previewUserId);
  const { data: teams } = useTeams();
  const isPreview = Boolean(previewUserId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!result || result.status !== "ok") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Gift className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Wrapped ainda não liberado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          A retrospectiva será liberada em breve, pereba. Volta aqui depois da final.
        </p>
        <button
          onClick={() => navigate({ to: "/app" })}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <WrappedStories
      data={result.data}
      teams={teams ?? []}
      onExit={() => navigate({ to: "/app" })}
      previewApelido={isPreview ? result.data.apelido : null}
    />
  );
}

function WrappedStories({
  data,
  teams,
  onExit,
  previewApelido,
}: {
  data: WrappedData;
  teams: Team[];
  onExit: () => void;
  previewApelido: string | null;
}) {
  const isMulti = data.abertura.n_quotas > 1;
  const cards = useMemo(() => buildCards(data, teams, isMulti), [data, teams, isMulti]);
  const [idx, setIdx] = useState(0);

  const next = () => setIdx((i) => Math.min(cards.length - 1, i + 1));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) prev();
    else next();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center gap-2 px-3 pt-3">
        {cards.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i <= idx ? "w-full bg-primary" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <button
          onClick={onExit}
          className="grid h-9 w-9 place-items-center rounded-full bg-muted/50 text-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Wrapped · {idx + 1}/{cards.length}
        </p>
        <div className="h-9 w-9" />
      </div>
      {previewApelido && (
        <div className="px-3 pb-1">
          <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Preview admin — {previewApelido}
          </span>
        </div>
      )}

      <div onClick={handleTap} className="flex-1 cursor-pointer select-none overflow-hidden px-4 pb-6 pt-2">
        <div className="mx-auto h-full max-w-md">{cards[idx]}</div>
      </div>
    </div>
  );
}

function buildCards(d: WrappedData, teams: Team[], isMulti: boolean): React.ReactNode[] {
  const cards: React.ReactNode[] = [];
  cards.push(<C1Abertura key="c1" d={d} />);
  cards.push(<C2Estilo key="c2" d={d} />);
  cards.push(<C3Cravadas key="c3" d={d} isMulti={isMulti} />);
  cards.push(<C4Trajetoria key="c4" d={d} isMulti={isMulti} />);
  cards.push(<C5Top4 key="c5" d={d} teams={teams} isMulti={isMulti} />);
  if (d.zebra) cards.push(<C6Zebra key="c6" d={d} isMulti={isMulti} />);
  cards.push(<C7Boletins key="c7" d={d} />);
  cards.push(<C8Final key="c8" d={d} isMulti={isMulti} />);
  cards.push(<C9Despedida key="c9" />);
  return cards;
}

/* ============ Cards ============ */

function CardShell({
  children,
  gradient = "from-primary via-primary to-accent",
  innerRef,
}: {
  children: React.ReactNode;
  gradient?: string;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={innerRef}
      className={`flex h-full w-full flex-col rounded-3xl bg-gradient-to-br ${gradient} p-7 text-primary-foreground shadow-glow`}
    >
      {children}
    </div>
  );
}

function C1Abertura({ d }: { d: WrappedData }) {
  const dt = d.abertura.primeiro_palpite ? new Date(d.abertura.primeiro_palpite) : null;
  return (
    <CardShell>
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Sparkles className="h-4 w-4" /> Sua Copa 2026
        </div>
        <h1 className="mt-6 font-display text-5xl font-black leading-tight">{d.apelido},</h1>
        <p className="font-display text-2xl font-bold opacity-90">bora relembrar?</p>
      </div>
      <div className="flex flex-1 flex-col justify-center space-y-4 py-4">
        <BigStat
          valor={d.abertura.n_quotas}
          label={d.abertura.n_quotas === 1 ? "quota comprada" : "quotas compradas"}
        />
        <BigStat valor={d.abertura.palpites_feitos.toLocaleString("pt-BR")} label="palpites feitos" />
        <BigStat valor={d.abertura.dias_de_bolao} label="dias de bolão" />
      </div>
      {dt && (
        <p className="text-xs opacity-70">
          Primeiro palpite em {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
        </p>
      )}
    </CardShell>
  );
}

function C2Estilo({ d }: { d: WrappedData }) {
  const placar = d.estilo.placar_favorito ?? "—";
  return (
    <CardShell gradient="from-accent via-accent to-primary">
      <div>
        <div className="text-xs uppercase tracking-widest opacity-80">Seu estilo</div>
        <p className="mt-6 font-display text-2xl font-bold leading-tight">Seu placar da sorte:</p>
      </div>
      <div className="flex flex-1 items-center justify-center py-4">
        <p className="font-display text-[7rem] font-black leading-none tracking-tighter">{placar}</p>
      </div>
      <div className="space-y-2 text-sm">
        {d.estilo.vezes_placar_favorito != null && d.estilo.pct_placar_favorito != null && (
          <p>
            Você apostou nele <span className="font-bold">{d.estilo.vezes_placar_favorito}</span>{" "}
            {d.estilo.vezes_placar_favorito === 1 ? "vez" : "vezes"} —{" "}
            <span className="font-bold">{d.estilo.pct_placar_favorito}%</span> dos seus{" "}
            {d.abertura.palpites_feitos.toLocaleString("pt-BR")} palpites
          </p>
        )}
        {d.estilo.media_gols_por_palpite != null && (
          <p>
            Seus palpites indicavam <span className="font-bold">{d.estilo.media_gols_por_palpite.toFixed(1)}</span> gols em média por jogo
          </p>
        )}
        {d.estilo.pct_empates != null && (
          <p>
            <span className="font-bold">{Math.round(d.estilo.pct_empates)}%</span> dos seus palpites foram empate
          </p>
        )}
      </div>
    </CardShell>
  );
}

function C3Cravadas({ d, isMulti }: { d: WrappedData; isMulti: boolean }) {
  const { total, melhor_quota, media_por_quota, aproveitamento_medio_pct, ouro } = d.cravadas;
  return (
    <CardShell gradient="from-yellow-500 via-orange-500 to-red-500">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
          <Target className="h-4 w-4" /> Cravadas
        </div>
        <p className="mt-4 font-display text-5xl font-black leading-none">{total}</p>
        <p className="mt-1 text-sm opacity-90">
          {total === 1 ? "placar cravado" : "placares cravados"} no total
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-3 text-sm">
        {melhor_quota && (
          <p className="leading-snug">
            <span className="font-display text-2xl font-black">{melhor_quota.cravadas}</span> placares cravados
            {isMulti && (
              <>
                {" "}na sua melhor quota <span className="font-bold">#{melhor_quota.quota_numero}</span>
              </>
            )}
            {" "}— <span className="font-bold">{melhor_quota.pct}%</span> dos {melhor_quota.palpites} palpites dela
          </p>
        )}
        {isMulti && media_por_quota != null && (
          <p className="opacity-90">
            Média de <span className="font-bold">{media_por_quota.toFixed(1)}</span> cravadas por quota
          </p>
        )}
        {isMulti && aproveitamento_medio_pct != null && (
          <p className="opacity-90">
            Aproveitamento médio de <span className="font-bold">{aproveitamento_medio_pct}%</span> nas suas {d.abertura.n_quotas} quotas
          </p>
        )}
      </div>

      {ouro ? (
        <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Cravada de ouro</p>
          <p className="mt-1 text-sm opacity-90">{ouro.jogo}</p>
          <p className="mt-1 font-display text-4xl font-black leading-none">{ouro.placar}</p>
          <p className="mt-2 text-xs opacity-90">
            Só <span className="font-bold">{ouro.quotas_que_acertaram}</span> de {d.total_quotas_bolao} quotas acertaram
            {isMulti && ouro.quota_numero != null && (
              <> · <span className="font-bold">quota #{ouro.quota_numero}</span></>
            )}
          </p>
        </div>
      ) : (
        <p className="text-sm italic opacity-90">Nenhum placar exato dessa vez. Faz parte, pereba.</p>
      )}
    </CardShell>
  );
}

function C4Trajetoria({ d, isMulti }: { d: WrappedData; isMulti: boolean }) {
  const { series, melhor_posicao, pior_posicao } = d.trajetoria;
  return (
    <CardShell gradient="from-blue-600 via-indigo-600 to-purple-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <TrendingUp className="h-4 w-4" /> Sua trajetória
        </div>
        {!isMulti && series[0]?.quota_numero != null && (
          <p className="mt-2 text-sm opacity-90">Quota #{series[0].quota_numero}</p>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center py-4">
        {series.length > 0 && series.some((s) => s.serie.length > 1) ? (
          <MultiSparkline series={series} total={d.total_quotas_bolao} isMulti={isMulti} />
        ) : (
          <p className="text-center text-sm opacity-80">Sem histórico suficiente pra desenhar a linha.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Melhor</p>
          <p className="font-display text-3xl font-black">{melhor_posicao ?? "—"}º</p>
        </div>
        <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Pior</p>
          <p className="font-display text-3xl font-black">{pior_posicao ?? "—"}º</p>
        </div>
      </div>
    </CardShell>
  );
}

function MultiSparkline({
  series,
  total,
  isMulti,
}: {
  series: Array<{ quota_numero: number; serie: Array<{ d: string; p: number }> }>;
  total: number;
  isMulti: boolean;
}) {
  const W = 320;
  const H = 170;
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 22;

  // Merge all dates as x-axis: use series index within each; but different series may have different lengths.
  // Simpler: normalize x by date. Collect all timestamps.
  const allDates = Array.from(new Set(series.flatMap((s) => s.serie.map((pt) => pt.d)))).sort();
  if (allDates.length < 2) return null;
  const t0 = new Date(allDates[0]).getTime();
  const tN = new Date(allDates[allDates.length - 1]).getTime();
  const xOf = (dstr: string) => {
    const t = new Date(dstr).getTime();
    const frac = tN === t0 ? 0.5 : (t - t0) / (tN - t0);
    return padL + frac * (W - padL - padR);
  };
  const maxP = Math.max(total, ...series.flatMap((s) => s.serie.map((pt) => pt.p)));
  const yOf = (p: number) =>
    padT + ((p - 1) / Math.max(1, maxP - 1)) * (H - padT - padB);

  const yTicks = [1, Math.round(maxP / 4), Math.round(maxP / 2), Math.round((3 * maxP) / 4), maxP];
  const colors = ["#ffffff", "#fde68a", "#a7f3d0", "#fca5a5", "#c4b5fd", "#67e8f9"];

  const firstDate = new Date(allDates[0]);
  const lastDate = new Date(allDates[allDates.length - 1]);
  const fmtDate = (dt: Date) => dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Y grid */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <text x={padL - 4} y={yOf(tick) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.7)">
              {tick}º
            </text>
          </g>
        ))}
        {/* X labels */}
        <text x={padL} y={H - 6} fontSize="9" fill="rgba(255,255,255,0.7)">
          {fmtDate(firstDate)}
        </text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.7)">
          {fmtDate(lastDate)}
        </text>
        {/* Lines */}
        {series.map((s, si) => {
          if (s.serie.length < 2) return null;
          const color = colors[si % colors.length];
          const path = s.serie
            .map((pt, i) => `${i === 0 ? "M" : "L"}${xOf(pt.d).toFixed(1)},${yOf(pt.p).toFixed(1)}`)
            .join(" ");
          return (
            <g key={si}>
              <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
              {s.serie.map((pt, i) => (
                <circle
                  key={i}
                  cx={xOf(pt.d)}
                  cy={yOf(pt.p)}
                  r={i === s.serie.length - 1 ? 3 : 1.5}
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {isMulti && (
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] opacity-90">
          {series.map((s, si) => (
            <span key={si} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: colors[si % colors.length] }}
              />
              Q#{s.quota_numero}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function resolveSlot(slot: string, teamByBp: Map<string, Team>): { nome: string; bandeira: string } {
  const team = teamByBp.get(slot);
  if (team) return { nome: team.nome_pt, bandeira: team.bandeira_emoji };
  return { nome: slot, bandeira: "🏳️" };
}

function Top4Bloco({
  titulo,
  entry,
  teamByBp,
  showQuota,
}: {
  titulo: string;
  entry: WrappedData["top4s"][number];
  teamByBp: Map<string, Team>;
  showQuota: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest opacity-80">{titulo}</p>
        {showQuota && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
            Q#{entry.quota_numero}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1.5">
        {entry.escolhas.slice(0, 4).map((slot, i) => {
          const { nome, bandeira } = resolveSlot(slot, teamByBp);
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 font-display text-[11px] font-black">
                {i + 1}
              </span>
              <span>{bandeira}</span>
              <span className="truncate font-display font-bold">{nome}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs opacity-90">
        <span className="font-bold">{entry.pontos.toLocaleString("pt-BR")}</span> pts · peso {entry.peso_no_palpite}
      </p>
    </div>
  );
}

function C5Top4({ d, teams, isMulti }: { d: WrappedData; teams: Team[]; isMulti: boolean }) {
  const teamByBp = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.bracket_position, t);
    return map;
  }, [teams]);

  const top4s = d.top4s ?? [];
  const melhor = top4s[0];
  const pior = top4s.length > 1 ? top4s[top4s.length - 1] : null;

  return (
    <CardShell gradient="from-emerald-600 via-teal-600 to-cyan-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Trophy className="h-4 w-4" /> Seu Top 4
        </div>
      </div>
      {top4s.length === 0 ? (
        <div className="flex flex-1 items-center">
          <p className="font-display text-xl font-bold leading-snug">
            Você não travou Top 4 dessa vez. Fica pra 2027.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {melhor && (
            <Top4Bloco
              titulo={isMulti && pior ? "O que rendeu" : "Seus escolhidos"}
              entry={melhor}
              teamByBp={teamByBp}
              showQuota={isMulti}
            />
          )}
          {isMulti && pior && (
            <Top4Bloco
              titulo="O que você prefere esquecer"
              entry={pior}
              teamByBp={teamByBp}
              showQuota={isMulti}
            />
          )}
        </div>
      )}
    </CardShell>
  );
}

function C6Zebra({ d, isMulti }: { d: WrappedData; isMulti: boolean }) {
  if (!d.zebra) return null;
  return (
    <CardShell gradient="from-rose-600 via-pink-600 to-fuchsia-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Zap className="h-4 w-4" /> Remou contra a maré
        </div>
        <p className="mt-5 text-sm opacity-90">{d.zebra.jogo}</p>
        <p className="mt-1 text-xs opacity-70">
          Peso {d.zebra.peso_do_jogo}
          {isMulti && d.zebra.quota_numero != null && <> · quota #{d.zebra.quota_numero}</>}
        </p>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Você apostou</p>
          <p className="font-display text-4xl font-black">{d.zebra.palpite}</p>
        </div>
        <div className="rounded-2xl bg-black/25 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Deu</p>
          <p className="font-display text-4xl font-black">{d.zebra.real}</p>
        </div>
      </div>
      {d.zebra.pct_perebada_pontuou != null && (
        <p className="text-sm opacity-90">
          <span className="font-bold">{d.zebra.pct_perebada_pontuou}%</span> da Perebada pontuou nesse jogo. Você não.
        </p>
      )}
    </CardShell>
  );
}

function C7Boletins({ d }: { d: WrappedData }) {
  const semCitacoes = d.citacoes_boletim === 0;
  return (
    <CardShell gradient="from-slate-700 via-slate-800 to-slate-900">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Quote className="h-4 w-4" /> Você nos boletins
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center space-y-6">
        {semCitacoes ? (
          <p className="font-display text-2xl font-black leading-tight">
            O cronista não te viu... mas o ranking sim.
          </p>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70">Citado no boletim</p>
            <p className="font-display text-7xl font-black leading-none">{d.citacoes_boletim}x</p>
          </div>
        )}
        {d.frase_cronista && (
          <blockquote className="rounded-2xl border-l-4 border-white/60 bg-white/10 p-4 backdrop-blur">
            <p className="font-display text-lg italic leading-snug">"{d.frase_cronista}"</p>
            <p className="mt-2 text-[11px] uppercase tracking-widest opacity-70">— o cronista do bolão</p>
          </blockquote>
        )}
      </div>
    </CardShell>
  );
}

function C8Final({ d, isMulti }: { d: WrappedData; isMulti: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const pior = isMulti && d.quotas_resumo.length > 1 ? d.quotas_resumo[d.quotas_resumo.length - 1] : null;

  const compartilhar = async () => {
    if (!ref.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0a0a0a",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `wrapped-${d.apelido}.png`, { type: "image/png" });

      const canShareFile =
        typeof navigator !== "undefined" &&
        (navigator as any).canShare &&
        (navigator as any).canShare({ files: [file] });

      if (canShareFile) {
        await (navigator as any).share({
          files: [file],
          title: "Meu Wrapped da Copa 2026",
          text: `Meu resumo do Bolão dos Perebas 2026`,
        });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `wrapped-${d.apelido}.png`;
        a.click();
        toast.success("Imagem salva. Compartilha onde quiser.");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Não deu pra gerar a imagem agora.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-hidden">
        <CardShell innerRef={ref} gradient="from-primary via-accent to-primary">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
              <Gift className="h-4 w-4" /> Wrapped Bolão dos Perebas
            </div>
            <p className="mt-4 font-display text-3xl font-black leading-tight">{d.apelido}</p>
            <p className="text-sm opacity-90">Copa 2026</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat
              label={isMulti ? `Melhor quota${d.ranking.quota_numero != null ? ` #${d.ranking.quota_numero}` : ""}` : "Posição"}
              valor={d.ranking.posicao != null ? `${d.ranking.posicao}º` : "—"}
            />
            <MiniStat label="Pontos" valor={(d.ranking.pontos ?? 0).toLocaleString("pt-BR")} />
            <MiniStat label="Cravadas" valor={String(d.cravadas.total)} />
            <MiniStat label="Citações" valor={`${d.citacoes_boletim}x`} />
          </div>
          {pior && (
            <p className="mt-3 text-xs opacity-80">
              Pior quota: #{pior.quota_numero}
              {pior.posicao != null && <> — {pior.posicao}º</>}
            </p>
          )}
          {d.ranking.premiado_categoria && (
            <div className="mt-3 rounded-2xl bg-white/25 p-3 text-center backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest opacity-80">Premiado</p>
              <p className="font-display text-lg font-black">{d.ranking.premiado_categoria}</p>
            </div>
          )}
          <p className="mt-auto pt-3 text-center text-xs opacity-80">Copa Feminina 2027 vem aí 🏆</p>
        </CardShell>
      </div>
      <button
        onClick={compartilhar}
        disabled={sharing}
        className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {sharing ? "Gerando..." : "Compartilhar"}
      </button>
    </div>
  );
}

function C9Despedida() {
  return (
    <CardShell gradient="from-primary via-primary to-accent">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Sparkles className="h-4 w-4" /> Até a próxima
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-5">
        <p className="font-display text-3xl font-black leading-tight">
          É isso, Perebada.
        </p>
        <p className="text-base leading-relaxed opacity-95">
          A Copa acabou, o bolão também — e já deixaram saudade.
        </p>
        <p className="text-base leading-relaxed opacity-95">
          Em <span className="font-bold">2027</span> tem Copa Feminina, e o bolão estará de volta.
        </p>
        <p className="font-display text-xl font-bold">A gente se vê lá! 🏆</p>
      </div>
    </CardShell>
  );
}

function BigStat({ valor, label }: { valor: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-4xl font-black">{valor}</span>
      <span className="text-sm opacity-90">{label}</span>
    </div>
  );
}

function MiniStat({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
      <p className="text-[10px] uppercase tracking-widest opacity-80">{label}</p>
      <p className="font-display text-xl font-black">{valor}</p>
    </div>
  );
}
