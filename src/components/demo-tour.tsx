import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Pause, Play, SkipForward, Trophy, Radio, ListOrdered, Calculator, BookText, Sparkles, Minus, Plus } from "lucide-react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";

type DemoData = {
  competicao: string;
  stats: { perebas: number; quotas: number; palpites: number; jogos: number; cravadas: number; boletins: number; nota: number };
  jogos_palpite: { casa: string; fora: string; flag_casa: string; flag_fora: string; peso: number; fase: string; data: string; placar_real: string }[];
  jogo_ao_vivo: {
    casa: string; fora: string; flag_casa: string; flag_fora: string;
    placar_casa: number; placar_fora: number;
    prorrogacao_casa: number; prorrogacao_fora: number;
    peso: number; fase: string; estadio: string;
    eventos?: { type?: string; detail?: string; player?: { name?: string }; team?: { name?: string }; time?: { elapsed?: number; extra?: number | null } }[];
  };
  ranking: { pos: number; apelido: string; quota: number; pontos: number }[];
  breakdown: { apelido: string; quota: number; total: number; linhas: { rotulo: string; valor: string }[] };
  boletim: { data: string; trecho: string };
  lideranca: { periodo: string; lider: string }[];
};

const STEP_MS = 6500;
const TOTAL_STEPS = 5;

function useDemoData() {
  return useQuery<DemoData | null>({
    queryKey: ["demo_copa2026"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("demo_copa2026");
      if (error) throw error;
      return data as DemoData;
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function DemoTour() {
  const { data, isLoading, isError } = useDemoData();
  if (isError) return null;
  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-md animate-pulse rounded-[2.5rem] border-8 border-neutral-900 bg-neutral-800 p-4 shadow-2xl">
        <div className="h-[560px] rounded-[2rem] bg-neutral-700" />
      </div>
    );
  }
  return <TourInner data={data} />;
}

function TourInner({ data }: { data: DemoData }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    if (paused || finished) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / STEP_MS);
      setProgress(p);
      if (p >= 1) {
        if (step >= TOTAL_STEPS - 1) setFinished(true);
        else setStep((s) => s + 1);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, paused, finished]);

  const go = (n: number) => {
    setFinished(false);
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, n)));
    setProgress(0);
    startRef.current = performance.now();
  };

  const stepIcons = [Sparkles, Radio, ListOrdered, Calculator, BookText];

  return (
    <div className="mx-auto w-full max-w-md" onPointerDown={() => setPaused(true)}>
      {/* Moldura celular */}
      <div className="relative rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2rem] bg-background">
          {/* Progress bars */}
          <div className="flex gap-1 bg-background/80 px-3 pb-1 pt-6 backdrop-blur">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: i < step ? "100%" : i === step ? `${progress * 100}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          <div className="min-h-[560px] px-4 pb-4">
            {finished ? (
              <FinalCard data={data} onReplay={() => { setFinished(false); go(0); }} />
            ) : (
              <>
                {step === 0 && <Step1 jogos={data.jogos_palpite} />}
                {step === 1 && <Step2 j={data.jogo_ao_vivo} />}
                {step === 2 && <Step3 ranking={data.ranking} lideranca={data.lideranca} />}
                {step === 3 && <Step4 breakdown={data.breakdown} />}
                {step === 4 && <Step5 boletim={data.boletim} stats={data.stats} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); go(step - 1); }}
          disabled={step === 0 && !finished}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {stepIcons.map((Icon, i) => {
            const active = !finished && i === step;
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); go(i); }}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
                aria-label={`Passo ${i + 1}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); startRef.current = performance.now() - progress * STEP_MS; }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label={paused ? "Retomar" : "Pausar"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setFinished(true); }}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground"
            aria-label="Pular"
          >
            <SkipForward className="h-3.5 w-3.5" /> Pular
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(step + 1); }}
            disabled={step >= TOTAL_STEPS - 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, badge, title, sub }: { icon: any; badge: string; title: string; sub?: string }) {
  return (
    <div className="pt-2">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        <Icon className="h-3 w-3" /> {badge}
      </div>
      <h3 className="mt-2 font-display text-xl font-extrabold leading-tight">{title}</h3>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/* ============ Step 1 ============ */
function Step1({ jogos }: { jogos: DemoData["jogos_palpite"] }) {
  const [palpites, setPalpites] = useState<Record<number, { c: number; f: number }>>({});
  const bump = (i: number, side: "c" | "f", delta: number) => {
    setPalpites((p) => {
      const cur = p[i] ?? { c: 0, f: 0 };
      return { ...p, [i]: { ...cur, [side]: Math.max(0, Math.min(9, cur[side] + delta)) } };
    });
  };
  return (
    <>
      <StepHeader icon={Sparkles} badge="Palpitar" title="Palpitar leva segundos" sub="Toque nos placares — é você jogando." />
      <div className="mt-4 space-y-3">
        {jogos.map((j, i) => {
          const p = palpites[i] ?? { c: 0, f: 0 };
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{j.fase} · {j.data}</span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 font-bold text-accent-foreground">peso {j.peso}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <TeamStepper flag={j.flag_casa} nome={j.casa} valor={p.c} onDec={() => bump(i, "c", -1)} onInc={() => bump(i, "c", +1)} />
                <span className="text-lg font-black text-muted-foreground">×</span>
                <TeamStepper flag={j.flag_fora} nome={j.fora} valor={p.f} onDec={() => bump(i, "f", -1)} onInc={() => bump(i, "f", +1)} align="right" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TeamStepper({ flag, nome, valor, onDec, onInc, align = "left" }: { flag: string; nome: string; valor: number; onDec: () => void; onInc: () => void; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="flex items-center gap-1.5">
        {align === "right" ? null : <span className="text-xl">{flag}</span>}
        <p className="line-clamp-1 text-sm font-bold">{nome}</p>
        {align === "right" ? <span className="text-xl">{flag}</span> : null}
      </div>
      <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 ${align === "right" ? "float-right" : ""}`}>
        <button onClick={onDec} className="grid h-7 w-7 place-items-center rounded-full bg-background text-foreground active:scale-95"><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-6 text-center font-display text-lg font-black tabular-nums">{valor}</span>
        <button onClick={onInc} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

/* ============ Step 2 ============ */
function Step2({ j }: { j: DemoData["jogo_ao_vivo"] }) {
  const [phase, setPhase] = useState(0); // 0: 78', 1: 90', 2: prorrogacao 105', 3: gol 106'
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 2600),
      setTimeout(() => setPhase(3), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  const showEt = phase >= 2;
  const showGoal = phase >= 3;
  const goalPlayer = j.eventos?.[0]?.player?.name ?? "Ferrán Torres";
  const minutoLabel = phase === 0 ? "78'" : phase === 1 ? "90'+3" : phase === 2 ? "105'" : "106'";
  const badgeLabel = phase >= 2 ? "PRORROGAÇÃO" : "AO VIVO";
  const casaProrr = showGoal ? j.prorrogacao_casa : 0;

  return (
    <>
      <StepHeader icon={Radio} badge="Ao vivo" title="Acompanhe ao vivo" sub={j.estadio} />
      <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest">
          <span className="rounded-full bg-accent/20 px-2 py-0.5 font-bold text-accent-foreground">{j.fase} · peso {j.peso}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${phase >= 2 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {badgeLabel} · {minutoLabel}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-center">
            <div className="text-4xl">{j.flag_casa}</div>
            <p className="mt-1 text-sm font-bold">{j.casa}</p>
          </div>
          <div className="text-center">
            <div className="flex items-baseline gap-2 font-display text-4xl font-black tabular-nums">
              <span>{j.placar_casa}</span>
              <span className="text-muted-foreground">×</span>
              <span>{j.placar_fora}</span>
            </div>
            {showEt && (
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 animate-fade-in">
                Prorrogação {casaProrr} × {j.prorrogacao_fora}
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-4xl">{j.flag_fora}</div>
            <p className="mt-1 text-sm font-bold">{j.fora}</p>
          </div>
        </div>
        {showGoal && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs animate-fade-in">
            <span className="text-lg">⚽</span>
            <p><strong>106'</strong> · Gol de <strong>{goalPlayer}</strong> — {j.casa} lidera na prorrogação!</p>
          </div>
        )}
      </div>
    </>
  );
}

/* ============ Step 3 ============ */
function Step3({ ranking, lideranca }: { ranking: DemoData["ranking"]; lideranca: DemoData["lideranca"] }) {
  return (
    <>
      <StepHeader icon={ListOrdered} badge="Ranking" title="Ranking que muda até o fim" sub="13.052 × 12.961 — 91 pontos decidiram a Copa." />
      <div className="mt-3 space-y-1">
        {ranking.slice(0, 8).map((r) => {
          const top = r.pos <= 2;
          return (
            <div
              key={`${r.apelido}-${r.quota}-${r.pos}`}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                top ? "border border-primary/40 bg-primary/10 shadow-sm" : "bg-muted/40"
              } ${r.pos === 1 ? "animate-fade-in" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${top ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>{r.pos}</span>
                <div>
                  <p className="font-bold leading-tight">{r.apelido}</p>
                  <p className="text-[10px] text-muted-foreground">Quota #{r.quota}</p>
                </div>
              </div>
              <span className="font-display font-black tabular-nums">{r.pontos.toLocaleString("pt-BR")}</span>
            </div>
          );
        })}
      </div>
      {lideranca?.length ? (
        <div className="mt-3 rounded-xl border border-border bg-card p-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Líderes ao longo da Copa</p>
          <div className="grid grid-cols-4 gap-1 text-center">
            {lideranca.slice(0, 4).map((l, i) => (
              <div key={i} className="rounded-lg bg-muted/40 p-1.5">
                <p className="text-[9px] text-muted-foreground">{l.periodo}</p>
                <p className="text-[10px] font-bold leading-tight">{l.lider}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ============ Step 4 ============ */
function Step4({ breakdown }: { breakdown: DemoData["breakdown"] }) {
  const [visible, setVisible] = useState(0);
  const [showTotal, setShowTotal] = useState(false);
  useEffect(() => {
    const timers: any[] = [];
    breakdown.linhas.forEach((_, i) => timers.push(setTimeout(() => setVisible(i + 1), 700 * (i + 1))));
    timers.push(setTimeout(() => setShowTotal(true), 700 * (breakdown.linhas.length + 1)));
    return () => timers.forEach(clearTimeout);
  }, [breakdown]);
  return (
    <>
      <StepHeader icon={Calculator} badge="Transparência" title="Cada ponto justificado" sub={`${breakdown.apelido} · Quota #${breakdown.quota}`} />
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          {breakdown.linhas.map((l, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm transition-all ${i < visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
            >
              <span>{l.rotulo}</span>
              <span className="font-display font-bold tabular-nums">{l.valor}</span>
            </div>
          ))}
        </div>
        <div className={`mt-4 flex items-baseline justify-between border-t border-border pt-3 transition-opacity ${showTotal ? "opacity-100" : "opacity-0"}`}>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-black text-primary tabular-nums">
            {breakdown.total.toLocaleString("pt-BR")} pts
          </span>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">Sem caixa-preta: toda linha é auditável e cada ponto tem origem.</p>
      </div>
    </>
  );
}

/* ============ Step 5 ============ */
function Step5({ boletim, stats }: { boletim: DemoData["boletim"]; stats: DemoData["stats"] }) {
  return (
    <>
      <StepHeader icon={BookText} badge="Crônica" title="A crônica do bolão" sub={`Boletim de ${boletim.data}`} />
      <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-hero text-primary-foreground">
            <BookText className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-foreground">Boletim diário</p>
            <p className="text-[10px]">{boletim.data}</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/90 line-clamp-[10]">{boletim.trecho}</p>
        <p className="mt-3 border-t border-border pt-2 text-center text-[10px] font-medium text-muted-foreground">
          {stats.boletins} edições · 53.790 palavras · nota {String(stats.nota).replace(".", ",")}
        </p>
      </div>
    </>
  );
}

/* ============ Final ============ */
function FinalCard({ data, onReplay }: { data: DemoData; onReplay: () => void }) {
  const nav = useNavigate();
  const loc = useLocation();
  const goChampions = () => {
    if (loc.pathname === "/champions") {
      document.getElementById("champions-cadastro")?.scrollIntoView({ behavior: "smooth" });
    } else {
      nav({ to: "/champions" });
    }
  };
  const s = data.stats;
  return (
    <div className="flex h-full flex-col justify-center pb-4 pt-6 text-center animate-fade-in">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-hero text-primary-foreground shadow-glow">
        <Trophy className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-2xl font-extrabold">Isso tudo é o Bolão dos Perebas.</h3>
      <p className="mt-1 text-xs text-muted-foreground">Copa 2026 — números reais e definitivos.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-left">
        {[
          [s.perebas, "Perebas"],
          [s.quotas, "Quotas"],
          [s.palpites.toLocaleString("pt-BR"), "Palpites"],
          [String(s.nota).replace(".", ","), "Nota média"],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-3">
            <p className="font-display text-2xl font-black text-primary">{v}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); goChampions(); }}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-hero px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-105"
      >
        Manifestar interesse na Champions →
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onReplay(); }}
        className="mt-2 text-[11px] font-medium text-muted-foreground underline hover:text-foreground"
      >
        Ver o tour de novo
      </button>
    </div>
  );
}
