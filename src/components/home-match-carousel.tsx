import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles, Timer } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMatches } from "@/lib/queries/matches";
import { useTeams } from "@/lib/queries/teams";
import { getTeamSide } from "@/lib/match-helpers";
import { PlacarJogo } from "@/components/placar-jogo";

type CardItem =
  | { id: string; kind: "resultado" | "proximo"; jogo: any }
  | { id: "countdown"; kind: "countdown"; kickoff: string };

const FRASES_PADRAO = [
  "Faltam {d} dias pra zoeira começar oficialmente.",
  "{d} dias até o primeiro vexame da Copa.",
  "{d} dias e a galera vai descobrir quem é pereba de verdade.",
  "Em {d} dias começa o show — e o choro.",
  "{d} dias pra alguém aqui errar todos os placares e bancar o lanterninha.",
  "Faltam {d} dias pro grupo do WhatsApp pegar fogo.",
  "{d} dias até teu palpite virar piada (ou estatística).",
  "{d} dias pra esquecer que tem trabalho na segunda.",
];

function escolheFrase(totalDays: number, totalHours: number, totalMinutes: number): string {
  if (totalDays === 0 && totalHours === 0 && totalMinutes < 60) {
    return "Tá pra começar! Última passada de olho nos palpites.";
  }
  if (totalDays === 0) {
    return `É hoje! Em ${Math.max(1, totalHours)} horas começa. Pega a pipoca.`;
  }
  if (totalDays === 1) {
    return "É amanhã, peraba! Última chance de fingir confiança nos palpites.";
  }
  if (totalDays <= 7) {
    return "Última semana, perebas! Hora de revisar palpites e fingir que entende de futebol.";
  }
  const f = FRASES_PADRAO[Math.floor(Math.random() * FRASES_PADRAO.length)];
  return f.replace("{d}", String(totalDays));
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function travaCountdown(iso?: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}min`;
}

export function HomeMatchCarousel() {
  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const items: CardItem[] = useMemo(() => {
    const all = matches as any[];
    const encerrados = all
      .filter((m) => m.status === "encerrado")
      .sort((a, b) => new Date(b.data_jogo).getTime() - new Date(a.data_jogo).getTime())
      .slice(0, 2)
      .map((j) => ({ id: j.id, kind: "resultado" as const, jogo: j }));
    const now = Date.now();
    const agendados = all
      .filter((m) => m.status === "agendado" && new Date(m.data_jogo).getTime() >= now)
      .sort((a, b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime());
    const proximos = agendados
      .slice(0, 3)
      .map((j) => ({ id: j.id, kind: "proximo" as const, jogo: j }));
    const list: CardItem[] = [...encerrados, ...proximos];
    const primeiro = agendados[0];
    if (primeiro && new Date(primeiro.data_jogo).getTime() > now) {
      list.push({ id: "countdown", kind: "countdown", kickoff: primeiro.data_jogo });
    }
    return list;
  }, [matches]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [fraseSeed, setFraseSeed] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setFraseSeed((s) => s + 1);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || paused || items.length <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [emblaApi, paused, items.length]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) {
    return (
      <div className="relative rounded-3xl border border-white/20 bg-white/10 p-8 text-center text-white/80 backdrop-blur-xl shadow-glow">
        <Sparkles className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-3 font-display text-lg font-bold">A perebada está se preparando…</p>
        <p className="mt-1 text-xs">Quando os jogos da Copa entrarem no sistema, eles aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute -inset-6 rounded-3xl bg-white/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-glow" ref={emblaRef}>
        <div className="flex">
          {items.map((it) => {
            const j = it.jogo;
            const tCasa = getTeamSide(j.team_home_id, j.slot_casa, j.casa, teamMap);
            const tFora = getTeamSide(j.team_away_id, j.slot_visitante, j.fora, teamMap);
            const trava = it.kind === "proximo" ? travaCountdown(j.travado_em) : null;
            return (
              <div key={it.id} className="min-w-0 flex-[0_0_100%] p-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/70">
                  <span>{it.kind === "resultado" ? "Resultado" : "Próximo jogo"}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">{j.fase}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{tCasa.bandeira}</div>
                    <p className="text-center text-sm font-bold">{tCasa.nome}</p>
                  </div>
                  <div className="text-center">
                    {it.kind === "resultado" ? (
                      <>
                        <PlacarJogo
                          placar_casa={j.placar_casa}
                          placar_fora={j.placar_fora}
                          placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                          placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                          penaltis_casa={j.penaltis_casa}
                          penaltis_fora={j.penaltis_fora}
                          size="lg"
                          className="text-white [&_*]:text-white/70"
                        />
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-white/60">Encerrado</p>
                      </>
                    ) : (
                      <>
                        <p className="font-display text-xl font-black">{fmtDateTime(j.data_jogo)}</p>
                        {trava && <p className="mt-1 text-[10px] uppercase tracking-widest text-accent">palpite até {trava}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{tFora.bandeira}</div>
                    <p className="text-center text-sm font-bold">{tFora.nome}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 1 && (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50 md:block"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50 md:block"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                selected === i ? "w-6 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
