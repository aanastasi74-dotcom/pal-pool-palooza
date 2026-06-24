import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, MessageCircle, Sparkles, Trophy } from "lucide-react";
import { useMatches } from "@/lib/queries/matches";
import { useTeams } from "@/lib/queries/teams";
import { useFrasesDoDia } from "@/lib/queries/frases-do-dia";
import { getTeamSide } from "@/lib/match-helpers";
import { PlacarJogo } from "@/components/placar-jogo";

const FRASES_SIMULADOR = [
  "Simulador no ar! Faça sua Copa, descubra teu campeão... pelo menos no papel →",
  "Pereba virou Galvão? Simulador disponível. Faça sua Copa do mundo →",
];

type CardItem =
  | { id: string; kind: "resultado" | "proximo"; jogo: any }
  | { id: "frase"; kind: "frase" }
  | { id: "simulador"; kind: "simulador" };

const FALLBACK_FRASE = "Mais um dia de Copa, perebada. Confere teus palpites e boa rodada!";

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
  const { data: fraseRow } = useFrasesDoDia();
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const items: CardItem[] = useMemo(() => {
    const all = matches as any[];
    const encerrados = all
      .filter((m) => m.status === "encerrado" || m.status === "ao-vivo")
      .sort((a, b) => new Date(b.data_jogo).getTime() - new Date(a.data_jogo).getTime())
      .slice(0, 3)
      .map((j) => ({ id: `r-${j.id}`, kind: "resultado" as const, jogo: j }));
    const now = Date.now();
    const proximos = all
      .filter((m) => m.status === "agendado" && new Date(m.data_jogo).getTime() >= now)
      .sort((a, b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime())
      .slice(0, 3)
      .map((j) => ({ id: `p-${j.id}`, kind: "proximo" as const, jogo: j }));
    const list: CardItem[] = [...encerrados, ...proximos];
    list.push({ id: "simulador", kind: "simulador" });
    list.push({ id: "frase", kind: "frase" });
    return list;
  }, [matches]);

  const [fraseSimulador] = useState(
    () => FRASES_SIMULADOR[Math.floor(Math.random() * FRASES_SIMULADOR.length)],
  );



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
            if (it.kind === "frase") {
              const frasesArr = (fraseRow?.frases?.length ? fraseRow.frases : [FALLBACK_FRASE]);
              const frase = frasesArr[fraseSeed % frasesArr.length] ?? FALLBACK_FRASE;
              return (
                <div key={it.id} className="min-w-0 flex-[0_0_100%] p-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/70">
                    <span className="flex items-center gap-1.5"><MessageCircle className="h-3 w-3" /> Frase do dia</span>
                    <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-bold">💭 Perebada</span>
                  </div>
                  <div className="my-6 rounded-2xl bg-accent/15 px-4 py-5 ring-1 ring-accent/30">
                    <p className="text-center font-display text-base font-bold leading-snug sm:text-lg">{frase}</p>
                  </div>
                  <p className="text-center text-[10px] uppercase tracking-widest text-white/50">
                    {fraseRow ? "Geradinha pra hoje" : "Bom dia, perebada"}
                  </p>
                </div>
              );
            }
            const j = it.jogo;
            const tCasa = getTeamSide(j.team_home_id, j.slot_casa, j.casa, teamMap);
            const tFora = getTeamSide(j.team_away_id, j.slot_visitante, j.fora, teamMap);
            const trava = it.kind === "proximo" ? travaCountdown(j.travado_em) : null;
            const aoVivo = j.status === "ao-vivo";
            const encerrado = j.status === "encerrado";
            // Eventos: identifica time pelo codigo_api (API-Football team.id)
            const codigoHome = (teamMap.get(j.team_home_id) as any)?.codigo_api;
            const codigoAway = (teamMap.get(j.team_away_id) as any)?.codigo_api;
            const eventos: any[] = Array.isArray(j.eventos) ? j.eventos : [];
            const golsDe = (codigo: number | null | undefined) => {
              if (codigo == null) return [];
              return eventos
                .filter((e) => e?.type === "Goal" && e?.team?.id === codigo)
                .sort((a, b) => (a?.time?.elapsed ?? 0) - (b?.time?.elapsed ?? 0));
            };
            const golsHome = it.kind === "resultado" ? golsDe(codigoHome) : [];
            const golsAway = it.kind === "resultado" ? golsDe(codigoAway) : [];
            const fmtGol = (e: any) => {
              const min = e?.time?.elapsed != null ? `${e.time.elapsed}'` : "";
              const extra = e?.time?.extra ? `+${e.time.extra}` : "";
              const nome = e?.player?.name ?? "?";
              const og = e?.detail === "Own Goal" ? " (GC)" : "";
              return `${min}${extra} ${nome}${og}`.trim();
            };
            const linkProps = it.kind === "proximo"
              ? { to: "/app/palpites" as const, search: { match_id: j.id } as any }
              : { to: "/app/jogo/$match_id/detalhes" as const, params: { match_id: j.id } };
            return (
              <div key={it.id} className="min-w-0 flex-[0_0_100%] p-5">
                <Link
                  {...(linkProps as any)}
                  className="block transition hover:scale-[1.01]"
                >
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/70">
                  <span className="flex items-center gap-2">
                    {it.kind === "resultado" ? (encerrado ? "Resultado" : "Em andamento") : "Próximo jogo"}
                    {aoVivo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        AO VIVO
                      </span>
                    )}
                    {encerrado && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">ENCERRADO</span>
                    )}
                  </span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">{j.fase}</span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="flex w-24 flex-col items-center gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{tCasa.bandeira}</div>
                    <p className="text-center text-sm font-bold">{tCasa.nome}</p>
                    {golsHome.length > 0 && (
                      <ul className="w-full space-y-0.5 text-center text-[10px] leading-tight text-white/85">
                        {golsHome.map((e, i) => (
                          <li key={i}>{fmtGol(e)}</li>
                        ))}
                      </ul>
                    )}
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
                      </>
                    ) : (
                      <>
                        <p className="font-display text-xl font-black">{fmtDateTime(j.data_jogo)}</p>
                        {trava && <p className="mt-1 text-[10px] uppercase tracking-widest text-accent">palpite até {trava}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex w-24 flex-col items-center gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{tFora.bandeira}</div>
                    <p className="text-center text-sm font-bold">{tFora.nome}</p>
                    {golsAway.length > 0 && (
                      <ul className="w-full space-y-0.5 text-center text-[10px] leading-tight text-white/85">
                        {golsAway.map((e, i) => (
                          <li key={i}>{fmtGol(e)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                </Link>
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
