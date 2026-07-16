import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { ArrowLeft, Share2, Gift, Sparkles, Trophy, TrendingUp, Target, Zap, Users, Loader2 } from "lucide-react";
import { useWrapped, type WrappedData } from "@/lib/queries/wrapped";

export const Route = createFileRoute("/app/wrapped")({
  head: () => ({ meta: [{ title: "Seu Wrapped — Bolão dos Perebas" }] }),
  component: WrappedPage,
});

function WrappedPage() {
  const navigate = useNavigate();
  const { data: result, isLoading } = useWrapped();

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

  return <WrappedStories data={result.data} onExit={() => navigate({ to: "/app" })} />;
}

function WrappedStories({ data, onExit }: { data: WrappedData; onExit: () => void }) {
  const cards = useMemo(() => buildCards(data), [data]);
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
    // Não avança se clicar num botão dentro do card
    if (target.closest("button, a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) prev();
    else next();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Progress bar */}
      <div className="flex items-center gap-2 px-3 pt-3">
        {cards.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i < idx ? "w-full bg-primary" : i === idx ? "w-full bg-primary" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>
      {/* Top bar */}
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

      {/* Story */}
      <div
        onClick={handleTap}
        className="flex-1 cursor-pointer select-none overflow-hidden px-4 pb-6 pt-2"
      >
        <div className="mx-auto h-full max-w-md">{cards[idx]}</div>
      </div>
    </div>
  );
}

function buildCards(d: WrappedData): React.ReactNode[] {
  const cards: React.ReactNode[] = [];
  cards.push(<C1Abertura key="c1" d={d} />);
  cards.push(<C2Estilo key="c2" d={d} />);
  cards.push(<C3Cravada key="c3" d={d} />);
  cards.push(<C4Trajetoria key="c4" d={d} />);
  cards.push(<C5Top4 key="c5" d={d} />);
  if (d.zebra) cards.push(<C6Zebra key="c6" d={d} />);
  cards.push(<C7VsPerebada key="c7" d={d} />);
  cards.push(<C8Final key="c8" d={d} />);
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
  innerRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      className={`flex h-full w-full flex-col justify-between rounded-3xl bg-gradient-to-br ${gradient} p-7 text-primary-foreground shadow-glow`}
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
        <h1 className="mt-6 font-display text-5xl font-black leading-tight">
          {d.apelido},
        </h1>
        <p className="font-display text-2xl font-bold opacity-90">bora relembrar?</p>
      </div>
      <div className="space-y-3">
        <BigStat valor={d.abertura.n_quotas} label={d.abertura.n_quotas === 1 ? "quota comprada" : "quotas compradas"} />
        <BigStat valor={d.abertura.palpites_feitos.toLocaleString("pt-BR")} label="palpites feitos" />
        <BigStat valor={d.abertura.dias_de_bolao} label="dias de bolão" />
        {dt && (
          <p className="pt-2 text-xs opacity-70">
            Primeiro palpite em {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </p>
        )}
      </div>
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
      <div className="flex flex-1 items-center justify-center py-6">
        <p className="font-display text-[7rem] font-black leading-none tracking-tighter">
          {placar}
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {d.estilo.media_gols_por_palpite != null && (
          <p>
            Média de <span className="font-bold">{d.estilo.media_gols_por_palpite.toFixed(1)}</span> gols por palpite
          </p>
        )}
        {d.estilo.pct_empates != null && (
          <p>
            <span className="font-bold">{Math.round(d.estilo.pct_empates * 100)}%</span> dos seus palpites foram empate
          </p>
        )}
      </div>
    </CardShell>
  );
}

function C3Cravada({ d }: { d: WrappedData }) {
  const { total, ouro } = d.cravadas;
  return (
    <CardShell gradient="from-yellow-500 via-orange-500 to-red-500">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
          <Target className="h-4 w-4" /> Cravada de ouro
        </div>
        {ouro ? (
          <>
            <p className="mt-5 text-sm opacity-90">{ouro.jogo}</p>
            <p className="mt-2 font-display text-7xl font-black leading-none tracking-tight">
              {ouro.placar}
            </p>
            <p className="mt-4 text-sm">
              Só <span className="font-bold">{ouro.quotas_que_acertaram}</span> de {d.total_quotas_bolao} quotas acertaram esse.
            </p>
          </>
        ) : (
          <p className="mt-6 font-display text-xl font-bold">
            Você não cravou nenhum placar exato. Faz parte, pereba.
          </p>
        )}
      </div>
      <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
        <p className="text-xs uppercase tracking-widest opacity-80">No total</p>
        <p className="font-display text-4xl font-black">{total}</p>
        <p className="text-xs opacity-90">{total === 1 ? "placar cravado" : "placares cravados"} na Copa</p>
      </div>
    </CardShell>
  );
}

function C4Trajetoria({ d }: { d: WrappedData }) {
  const { serie, melhor_posicao, pior_posicao, quota_numero } = d.trajetoria;
  return (
    <CardShell gradient="from-blue-600 via-indigo-600 to-purple-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <TrendingUp className="h-4 w-4" /> Sua trajetória
        </div>
        {quota_numero != null && (
          <p className="mt-2 text-sm opacity-90">Quota #{quota_numero}</p>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center py-6">
        {serie.length > 1 ? (
          <Sparkline serie={serie} total={d.total_quotas_bolao} />
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

function Sparkline({ serie, total }: { serie: Array<{ d: string; p: number }>; total: number }) {
  const W = 300;
  const H = 140;
  const pad = 8;
  const xs = serie.map((_, i) => pad + (i * (W - 2 * pad)) / Math.max(1, serie.length - 1));
  // Y invertido: pos 1 no topo
  const maxP = Math.max(total, ...serie.map((s) => s.p));
  const ys = serie.map((s) => pad + ((s.p - 1) / Math.max(1, maxP - 1)) * (H - 2 * pad));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${path} L${xs[xs.length - 1].toFixed(1)},${H - pad} L${xs[0].toFixed(1)},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <path d={area} fill="rgba(255,255,255,0.15)" />
      <path d={path} stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4 : 2} fill="white" />
      ))}
    </svg>
  );
}

function C5Top4({ d }: { d: WrappedData }) {
  return (
    <CardShell gradient="from-emerald-600 via-teal-600 to-cyan-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Trophy className="h-4 w-4" /> Seu Top 4
        </div>
        {d.top4 ? (
          <>
            <p className="mt-5 text-sm opacity-90">
              Peso <span className="font-bold">{d.top4.peso_no_palpite}</span> no palpite
            </p>
            <div className="mt-4 space-y-2">
              {d.top4.escolhas.map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 font-display text-sm font-black">
                    {i + 1}
                  </span>
                  <span className="font-display font-bold">{t}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-8 font-display text-xl font-bold leading-snug">
            Você não travou Top 4 dessa vez. Fica pra 2027.
          </p>
        )}
      </div>
      {d.top4 && (
        <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Pontos no Top 4</p>
          <p className="font-display text-4xl font-black">{d.top4.pontos.toLocaleString("pt-BR")}</p>
        </div>
      )}
    </CardShell>
  );
}

function C6Zebra({ d }: { d: WrappedData }) {
  if (!d.zebra) return null;
  return (
    <CardShell gradient="from-rose-600 via-pink-600 to-fuchsia-700">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Zap className="h-4 w-4" /> A que te pegou
        </div>
        <p className="mt-5 text-sm opacity-90">{d.zebra.jogo}</p>
        <p className="mt-1 text-xs opacity-70">Peso {d.zebra.peso_do_jogo}</p>
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
      <p className="text-sm italic opacity-90">Faz parte, pereba.</p>
    </CardShell>
  );
}

function C7VsPerebada({ d }: { d: WrappedData }) {
  return (
    <CardShell gradient="from-slate-700 via-slate-800 to-slate-900">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Users className="h-4 w-4" /> Você vs a Perebada
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">Sua posição</p>
          <p className="font-display text-7xl font-black leading-none">
            {d.ranking.posicao ?? "—"}
            <span className="text-3xl opacity-70">º</span>
          </p>
          <p className="mt-1 text-sm opacity-90">de {d.ranking.total_quotas} quotas</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest opacity-70">Citado no boletim</p>
          <p className="font-display text-3xl font-black">{d.citacoes_boletim}x</p>
        </div>
      </div>
    </CardShell>
  );
}

function C8Final({ d }: { d: WrappedData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

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
        // Fallback: download
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
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Posição" valor={d.ranking.posicao != null ? `${d.ranking.posicao}º` : "—"} />
            <MiniStat label="Pontos" valor={(d.ranking.pontos ?? 0).toLocaleString("pt-BR")} />
            <MiniStat label="Cravadas" valor={String(d.cravadas.total)} />
            <MiniStat label="Citações" valor={`${d.citacoes_boletim}x`} />
          </div>
          {d.ranking.premiado_categoria && (
            <div className="rounded-2xl bg-white/25 p-3 text-center backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest opacity-80">Premiado</p>
              <p className="font-display text-lg font-black">{d.ranking.premiado_categoria}</p>
            </div>
          )}
          <p className="text-center text-xs opacity-80">Copa Feminina 2027 vem aí 🏆</p>
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
