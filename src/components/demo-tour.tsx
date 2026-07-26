import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipForward,
  Radio,
  ListOrdered,
  Calculator,
  BookText,
  Sparkles,
  Minus,
  Plus,
  Pencil,
  Check,
  Crown,
  Trophy,
  Ticket,
  Hash,
  Wallet,
  Upload,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";

/* ============ Tipos locais (RPC como any pra não travar em types stale) ============ */
type DemoData = any;

const STEP_MS = [9000, 9000, 13000, 11000, 10000, 11000, 999999];
const TOTAL_STEPS = 7;

function useDemoData() {
  return useQuery<DemoData | null>({
    queryKey: ["demo_copa2026_v2"],
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
        <div className="h-[620px] rounded-[2rem] bg-neutral-700" />
      </div>
    );
  }
  return <TourInner data={data} />;
}

function TourInner({ data }: { data: DemoData }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    if (paused) return;
    startRef.current = performance.now();
    setProgress(0);
    let raf = 0;
    const dur = STEP_MS[step] ?? 10000;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / dur);
      setProgress(p);
      if (p >= 1) {
        if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, paused]);

  const go = (n: number) => {
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, n)));
    setProgress(0);
    startRef.current = performance.now();
  };

  const stepIcons = [Ticket, Sparkles, Radio, ListOrdered, Calculator, BookText, Trophy];

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />
        <div className="relative overflow-hidden rounded-[2rem] bg-background">
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

          <div className="min-h-[620px] px-4 pb-4" onPointerDown={() => setPaused(true)}>
            {step === 0 && <Step1 jogos={data.jogos_palpite ?? []} onInteract={() => setPaused(true)} />}
            {step === 1 && <Step2 j={data.jogo_virada} regras={data.regras} />}
            {step === 2 && <Step3 tl={data.timelapse} lideranca={data.lideranca ?? []} />}
            {step === 3 && <Step4 regras={data.regras} comp={data.composicao_campeao} />}
            {step === 4 && <Step5 boletim={data.boletim} stats={data.stats} />}
            {step === 5 && <Step6 stats={data.stats} />}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); go(step - 1); }}
          disabled={step === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {stepIcons.map((Icon, i) => {
            const active = i === step;
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
            onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); startRef.current = performance.now() - progress * (STEP_MS[step] ?? 10000); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label={paused ? "Retomar" : "Pausar"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(step + 1); }}
            disabled={step >= TOTAL_STEPS - 1}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground disabled:opacity-40"
            aria-label="Próximo"
          >
            <SkipForward className="h-3.5 w-3.5" /> Próximo
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

/* ============ Regra de pontuação (client-side) ============ */
function calcPontos(pc: number, pf: number, rc: number, rf: number, peso: number): number {
  let base = 0;
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  if (pc === rc && pf === rf) base = 12;
  else {
    const resultado = sign(pc - pf) === sign(rc - rf);
    const dif = (pc - pf) === (rc - rf);
    const gols = pc === rc || pf === rf;
    if (resultado && dif) base = 6;
    else if (resultado && gols) base = 5;
    else if (resultado) base = 4;
    else if (dif) base = 2;
    else if (gols) base = 1;
    else base = 0;
  }
  return base * peso;
}

/* ============ Step 1 — Palpitar leva segundos ============ */
function Step1({ jogos, onInteract }: { jogos: any[]; onInteract: () => void }) {
  // Encenação no card #2 (index 1 se existir, senão 0)
  const idx = Math.min(1, jogos.length - 1);
  const [placares, setPlacares] = useState<Record<number, { c: number; f: number; edit: boolean; saved: boolean }>>(() => {
    const init: any = {};
    jogos.forEach((_, i) => (init[i] = { c: 0, f: 0, edit: false, saved: false }));
    return init;
  });
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; press: boolean }>({ x: 50, y: 50, visible: false, press: false });
  const [toast, setToast] = useState(false);
  const [userInterrupted, setUserInterrupted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const moveCursorTo = (selector: string, press = false) =>
    new Promise<void>((resolve) => {
      const root = rootRef.current;
      if (!root) return resolve();
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) return resolve();
      const r = el.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      setCursor({
        x: r.left - rr.left + r.width / 2,
        y: r.top - rr.top + r.height / 2,
        visible: true,
        press,
      });
      setTimeout(resolve, 600);
    });

  useEffect(() => {
    let cancel = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      if (cancel || userInterrupted) return;
      await moveCursorTo(`[data-c1-edit="${idx}"]`, true);
      if (cancel || userInterrupted) return;
      setPlacares((p) => ({ ...p, [idx]: { ...p[idx], edit: true } }));
      await new Promise((r) => setTimeout(r, 400));
      // +1 casa
      await moveCursorTo(`[data-c1-inc-c="${idx}"]`, true);
      if (cancel || userInterrupted) return;
      setPlacares((p) => ({ ...p, [idx]: { ...p[idx], c: 1 } }));
      await new Promise((r) => setTimeout(r, 350));
      await moveCursorTo(`[data-c1-inc-c="${idx}"]`, true);
      if (cancel || userInterrupted) return;
      setPlacares((p) => ({ ...p, [idx]: { ...p[idx], c: 2 } }));
      await new Promise((r) => setTimeout(r, 350));
      // +1 fora
      await moveCursorTo(`[data-c1-inc-f="${idx}"]`, true);
      if (cancel || userInterrupted) return;
      setPlacares((p) => ({ ...p, [idx]: { ...p[idx], f: 1 } }));
      await new Promise((r) => setTimeout(r, 500));
      // salvar
      await moveCursorTo(`[data-c1-save="${idx}"]`, true);
      if (cancel || userInterrupted) return;
      setPlacares((p) => ({ ...p, [idx]: { ...p[idx], edit: false, saved: true } }));
      setToast(true);
      setCursor((c) => ({ ...c, visible: false }));
      setTimeout(() => !cancel && setToast(false), 2200);
    })();
    return () => { cancel = true; };
  }, [idx, userInterrupted]);

  const bump = (i: number, side: "c" | "f", delta: number) => {
    onInteract();
    setUserInterrupted(true);
    setCursor((c) => ({ ...c, visible: false }));
    setPlacares((p) => {
      const cur = p[i];
      return { ...p, [i]: { ...cur, [side]: Math.max(0, Math.min(9, cur[side] + delta)) } };
    });
  };

  return (
    <>
      <StepHeader icon={Sparkles} badge="Palpitar" title="Palpitar leva segundos" sub="Toque em Editar e nos steppers — nada é salvo." />
      <div ref={rootRef} className="relative mt-4 space-y-3">
        {jogos.map((j, i) => {
          const st = placares[i];
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{j.fase} · {j.data}</span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 font-bold text-accent-foreground">peso {j.peso}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <TeamLine flag={j.flag_casa} nome={j.casa} />
                {st.edit ? (
                  <div className="flex items-center gap-1">
                    <StepperMini value={st.c} onDec={() => bump(i, "c", -1)} onInc={() => bump(i, "c", +1)} dataInc={`c1-inc-c` } dataAttr={{ "data-c1-inc-c": String(i) }} />
                    <span className="font-black text-muted-foreground">×</span>
                    <StepperMini value={st.f} onDec={() => bump(i, "f", -1)} onInc={() => bump(i, "f", +1)} dataInc={`c1-inc-f`} dataAttr={{ "data-c1-inc-f": String(i) }} />
                  </div>
                ) : (
                  <div key={`${st.c}-${st.f}`} className="flex items-baseline justify-center gap-2 font-display text-3xl font-black tabular-nums animate-fade-in">
                    <span>{st.c}</span>
                    <span className="text-muted-foreground">×</span>
                    <span>{st.f}</span>
                  </div>
                )}
                <TeamLine flag={j.flag_fora} nome={j.fora} align="right" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {st.saved ? "Palpite salvo" : st.edit ? "Editando…" : "Salvo · toque em editar"}
                </span>
                {st.edit ? (
                  <button
                    data-c1-save={i}
                    onClick={(e) => { e.stopPropagation(); onInteract(); setUserInterrupted(true); setPlacares((p) => ({ ...p, [i]: { ...p[i], edit: false, saved: true } })); setToast(true); setTimeout(() => setToast(false), 1800); }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground"
                  >
                    <Check className="h-3 w-3" /> Salvar
                  </button>
                ) : (
                  <button
                    data-c1-edit={i}
                    onClick={(e) => { e.stopPropagation(); onInteract(); setUserInterrupted(true); setPlacares((p) => ({ ...p, [i]: { ...p[i], edit: true } })); }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {/* Cursor */}
        {cursor.visible && (
          <div
            className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30 transition-all duration-500 ease-out ${cursor.press ? "h-7 w-7 opacity-100" : "h-8 w-8 opacity-80"}`}
            style={{ left: cursor.x, top: cursor.y }}
          />
        )}
        {/* Toast */}
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg animate-fade-in">
            Palpite salvo ✓
          </div>
        )}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Cada jogo vale mais que o anterior — o peso cresce de 10 até 50.</p>
    </>
  );
}

function TeamLine({ flag, nome, align = "left" }: { flag: string; nome: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        {align === "right" ? null : <span className="text-xl">{flag}</span>}
        <p className="line-clamp-1 text-sm font-bold">{nome}</p>
        {align === "right" ? <span className="text-xl">{flag}</span> : null}
      </div>
    </div>
  );
}

function StepperMini({ value, onDec, onInc, dataAttr }: { value: number; onDec: () => void; onInc: () => void; dataInc?: string; dataAttr?: Record<string, string> }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-0.5">
      <button onClick={(e) => { e.stopPropagation(); onDec(); }} className="grid h-6 w-6 place-items-center rounded-full bg-background text-foreground active:scale-95"><Minus className="h-3 w-3" /></button>
      <span key={value} className="w-5 text-center font-display text-base font-black tabular-nums animate-scale-in">{value}</span>
      <button {...dataAttr} onClick={(e) => { e.stopPropagation(); onInc(); }} className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95"><Plus className="h-3 w-3" /></button>
    </div>
  );
}

/* ============ Step 2 — A virada ============ */
function Step2({ j, regras }: { j: any; regras: any }) {
  const timeline = (j?.timeline ?? []) as { min: number; casa: number; fora: number; evento: string }[];
  const palpites = (j?.palpites ?? []) as { apelido: string; quota: number; pos_final: number; casa: number; fora: number; pontos_final: number }[];
  const peso: number = j?.peso ?? 36;
  const [idx, setIdx] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setIdx(0);
    setEnded(false);
    if (!timeline.length) return;
    const timers: any[] = [];
    timeline.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setIdx(i), i * 1500));
    });
    timers.push(setTimeout(() => setEnded(true), timeline.length * 1500 + 800));
    return () => timers.forEach(clearTimeout);
  }, [timeline.length]);

  const cur = timeline[idx] ?? { min: 0, casa: 0, fora: 0, evento: "" };

  const linhas = useMemo(() => {
    if (!palpites.length) return [];
    const pts = palpites.map((p) => ({
      ...p,
      pts: ended ? p.pontos_final : calcPontos(p.casa, p.fora, cur.casa, cur.fora, peso),
    }));
    if (ended) return pts.sort((a, b) => a.pos_final - b.pos_final);
    return pts.sort((a, b) => b.pts - a.pts || a.pos_final - b.pos_final);
  }, [palpites, cur.casa, cur.fora, ended, peso]);

  if (!j) return <div className="p-6 text-center text-sm text-muted-foreground">Sem dados do jogo.</div>;

  return (
    <>
      <StepHeader icon={Radio} badge="Ao vivo" title="Acompanhe ao vivo" sub={`${j.fase} · ${j.estadio}`} />
      <div className="mt-3 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest">
          <span className="rounded-full bg-accent/20 px-2 py-0.5 font-bold text-accent-foreground">peso {peso}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${ended ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {ended ? "FIM" : "AO VIVO"} · {cur.min}'
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-center">
            <div className="text-3xl">{j.flag_casa}</div>
            <p className="mt-0.5 text-xs font-bold">{j.casa}</p>
          </div>
          <div key={`${cur.casa}-${cur.fora}`} className="text-center animate-scale-in">
            <div className="flex items-baseline gap-2 font-display text-4xl font-black tabular-nums">
              <span>{cur.casa}</span>
              <span className="text-muted-foreground">×</span>
              <span>{cur.fora}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl">{j.flag_fora}</div>
            <p className="mt-0.5 text-xs font-bold">{j.fora}</p>
          </div>
        </div>
        {cur.evento && (
          <div key={cur.min} className="mt-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-center text-xs font-bold text-primary animate-fade-in">
            {cur.min}' · {cur.evento}
          </div>
        )}
      </div>

      {/* Lista de palpites */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-2">
        <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {ended ? "Pontos finais deste jogo" : "Pontos parciais — ao vivo"}
        </p>
        <div className="space-y-1">
          {linhas.map((p, rank) => (
            <div
              key={`${p.apelido}-${p.quota}`}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-xs transition-all duration-500"
              style={{ transform: `translateY(0)` }}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-background text-[10px] font-black">{rank + 1}</span>
                <span className="font-bold">{p.apelido}<span className="text-muted-foreground"> #{p.quota}</span></span>
                <span className="text-muted-foreground tabular-nums">{p.casa}×{p.fora}</span>
              </div>
              <span key={p.pts} className={`font-display font-black tabular-nums animate-scale-in ${p.pts > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {p.pts}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Peso {peso}. O mesmo acerto na estreia valeria {6 * (regras?.peso?.min ?? 10)}.</p>
    </>
  );
}

/* ============ Step 3 — Time-lapse ============ */
function Step3({ tl, lideranca }: { tl: any; lideranca: any[] }) {
  const dias: string[] = tl?.dias ?? [];
  const series: { apelido: string; quota: number; pos_final: number; pontos: number[]; posicoes: number[] }[] = tl?.series ?? [];
  const [t, setT] = useState(0); // 0..dias.length-1 (float)
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    if (!playing || !dias.length) return;
    const total = dias.length - 1;
    const dur = 8000;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + (total / dur) * dt;
        if (next >= total) { setPlaying(false); return total; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, dias.length]);

  if (!dias.length || !series.length) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Sem timelapse.</div>;
  }

  const i0 = Math.floor(t);
  const i1 = Math.min(dias.length - 1, i0 + 1);
  const frac = t - i0;
  const interp = (a: number, b: number) => a + (b - a) * frac;

  const rows = series.map((s) => ({
    apelido: s.apelido,
    quota: s.quota,
    pontos: interp(s.pontos[i0] ?? 0, s.pontos[i1] ?? 0),
    posicao: interp(s.posicoes[i0] ?? 99, s.posicoes[i1] ?? 99),
    pos_final: s.pos_final,
  }));
  const maxPts = Math.max(1, ...rows.map((r) => r.pontos));
  const sorted = [...rows].sort((a, b) => a.posicao - b.posicao);
  const lider = sorted[0];

  const diaLabel = dias[Math.round(t)] ?? dias[0];

  return (
    <>
      <StepHeader icon={ListOrdered} badge="Ranking" title="O ranking nunca ficou parado" sub="28 dias, 4 líderes diferentes." />
      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
          <Crown className="h-3.5 w-3.5" /> {lider.apelido} #{lider.quota}
        </div>
        <span className="font-display text-lg font-black text-muted-foreground tabular-nums">{diaLabel}</span>
      </div>
      <div className="relative mt-3 h-[280px]">
        {sorted.map((r, rank) => (
          <div
            key={`${r.apelido}-${r.quota}`}
            className="absolute left-0 right-0 flex items-center gap-2 transition-all duration-500 ease-out"
            style={{ top: rank * 44 }}
          >
            <span className="w-5 text-center text-[10px] font-black text-muted-foreground">{rank + 1}</span>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px]">
                <span className="font-bold">{r.apelido}<span className="text-muted-foreground"> #{r.quota}</span></span>
                <span className="font-display font-black tabular-nums">{Math.round(r.pontos).toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${rank === 0 ? "bg-primary" : "bg-primary/60"}`}
                  style={{ width: `${(r.pontos / maxPts) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); if (t >= dias.length - 1) setT(0); }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card"
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <input
          type="range"
          min={0}
          max={dias.length - 1}
          step={0.01}
          value={t}
          onChange={(e) => { setPlaying(false); setT(parseFloat(e.target.value)); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 accent-primary"
        />
      </div>
      {t >= dias.length - 1 && (
        <p className="mt-2 text-center text-[11px] font-bold text-foreground animate-fade-in">
          A liderança mudou 4 vezes. A última, no dia da final.
        </p>
      )}
    </>
  );
}

/* ============ Step 4 — Transparência ============ */
function Step4({ regras, comp }: { regras: any; comp: any }) {
  const placar: { caso: string; pts: number }[] = regras?.placar ?? [];
  const top4: { janela: string; eficacia: number; max: number }[] = regras?.top4 ?? [];
  const [showTotal, setShowTotal] = useState(false);
  useEffect(() => {
    setShowTotal(false);
    const t = setTimeout(() => setShowTotal(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <StepHeader icon={Calculator} badge="Transparência" title="Cada ponto justificado" sub="Sem caixa-preta." />
      <div className="mt-3 space-y-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Placar</p>
          <div className="space-y-1">
            {placar.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span>{l.caso}</span>
                <span className="font-display font-black tabular-nums text-primary">{l.pts}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 rounded-lg bg-primary/10 px-2 py-1.5 text-[10px] font-medium text-foreground">
            {regras?.peso?.nota ?? "Tudo multiplicado pelo peso do jogo: 10 na estreia, 50 na final."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top 4 · escadinha</p>
          <div className="space-y-1">
            {top4.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1 text-xs" style={{ marginLeft: i * 8 }}>
                <span>{t.janela}</span>
                <span className="font-display font-bold tabular-nums">{t.eficacia}{t.max !== 0 ? <span className="text-muted-foreground"> ({t.max.toLocaleString("pt-BR")})</span> : null}</span>
              </div>
            ))}
          </div>
        </div>

        {comp && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Como o campeão fez {comp.total?.toLocaleString?.("pt-BR")}</p>
            <div className="flex items-center justify-between text-xs">
              <span>{comp.palpites} palpites · {comp.exatos} exatos · {comp.pontuados} pontuados</span>
              <span className="text-muted-foreground">{comp.aproveitamento}%</span>
            </div>
            <div className={`mt-2 flex items-baseline justify-between border-t border-border pt-2 transition-opacity ${showTotal ? "opacity-100" : "opacity-30"}`}>
              <span className="text-xs">
                <span className="font-display font-black">{comp.pontos_placares?.toLocaleString?.("pt-BR")}</span>
                <span className="text-muted-foreground"> placares </span>
                + <span className="font-display font-black">{comp.pontos_top4?.toLocaleString?.("pt-BR")}</span>
                <span className="text-muted-foreground"> Top 4</span>
              </span>
              <span className="font-display text-xl font-black text-primary tabular-nums">= {comp.total?.toLocaleString?.("pt-BR")}</span>
            </div>
            {comp.exemplo_jogo && (
              <p className="mt-2 rounded-lg bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
                Ex: {comp.exemplo_jogo.jogo} — palpitou {comp.exemplo_jogo.palpite} → {comp.exemplo_jogo.regra} × peso {comp.exemplo_jogo.peso} = <strong className="text-foreground">{comp.exemplo_jogo.pontos} pts</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ============ Step 5 — Boletim (máquina de escrever) ============ */
function Step5({ boletim, stats }: { boletim: any; stats: any }) {
  const full: string = boletim?.trecho ?? "";
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setN(0);
    setDone(false);
    if (!full) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= full.length) { window.clearInterval(id); setDone(true); }
    }, 28);
    return () => window.clearInterval(id);
  }, [full]);

  const reveal = () => { setN(full.length); setDone(true); };

  return (
    <>
      <StepHeader icon={BookText} badge="Crônica" title="A crônica do bolão" sub={`Boletim do Pereba — ${boletim?.data ?? ""}`} />
      <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm" onClick={reveal}>
        <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {full.slice(0, n)}
          {!done && <span className="ml-0.5 inline-block h-3 w-1.5 -mb-0.5 animate-pulse bg-primary" />}
        </p>
        <p className="mt-3 border-t border-border pt-2 text-center text-[10px] font-medium text-muted-foreground">
          {stats?.boletins ?? 36} edições · {(stats?.palavras ?? 53790).toLocaleString("pt-BR")} palavras · todo dia às 8h
        </p>
        <p className="mt-2 rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[11px] font-bold text-primary">
          4ª feature mais elogiada pela Perebada — {stats?.votos_boletim ?? 0} votos
        </p>
      </div>
    </>
  );
}

/* ============ Step 6 — Fechamento ============ */
function Step6({ stats }: { stats: any }) {
  const nav = useNavigate();
  const loc = useLocation();
  const goChampions = () => {
    if (loc.pathname === "/champions") {
      document.getElementById("champions-cadastro")?.scrollIntoView({ behavior: "smooth" });
    } else {
      nav({ to: "/champions" });
    }
  };
  return (
    <div className="flex h-full flex-col justify-center gap-4 pt-6 animate-fade-in">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-accent/10 p-5 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-hero text-primary-foreground shadow-glow">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight">2027 tem mais.</h3>
        <p className="mt-1 text-sm">Vem aí a <strong>Copa do Mundo Feminina</strong>.</p>
        <p className="mt-3 text-[10px] text-muted-foreground">
          {stats?.perebas ?? 71} perebas · {stats?.quotas ?? 111} quotas · {(stats?.palpites ?? 11042).toLocaleString("pt-BR")} palpites · nota {String(stats?.nota ?? 9.79).replace(".", ",")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-center">
        <p className="font-display text-lg font-extrabold">Não aguenta esperar até lá?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A Champions começa em setembro. Manifeste seu interesse — se a Perebada topar, tem bolão antes.
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); goChampions(); }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-hero px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
        >
          Manifestar interesse na Champions →
        </button>
      </div>
    </div>
  );
}
