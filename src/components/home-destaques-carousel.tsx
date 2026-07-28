import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CardBase = { tipo: string; tag: string; emoji: string; titulo: string; texto: string };
type CardJogo = CardBase & { tipo: "jogo"; casa: string; fora: string; fc: string; ff: string; placar: string; detalhe?: string };
type CardFato = CardBase & { tipo: "fato"; destaque: string };
type CardCta = CardBase & { tipo: "cta"; botao: string; rota: string };
type Card = CardJogo | CardFato | CardCta;
type Destaques = { competicao: string; encerrada: boolean; cards: Card[] };

const FALLBACK: Destaques = {
  competicao: "Copa do Mundo 2026",
  encerrada: true,
  cards: [
    {
      tipo: "cta",
      tag: "Próxima competição",
      emoji: "🏆",
      titulo: "Champions 2026/27",
      texto: "A perebada tá se organizando pra próxima. Vem manifestar interesse.",
      botao: "Quero saber mais →",
      rota: "/champions",
    },
  ],
};

async function fetchDestaques(): Promise<Destaques> {
  const { data, error } = await (supabase.rpc as any)("destaques_landing");
  if (error) throw error;
  return data as Destaques;
}

export function HomeDestaquesCarousel() {
  const { data, isLoading } = useQuery({
    queryKey: ["destaques-landing"],
    queryFn: fetchDestaques,
    staleTime: 60 * 60 * 1000,
  });

  const payload: Destaques = data ?? (isLoading ? { competicao: "", encerrada: false, cards: [] } : FALLBACK);
  const cards = payload.cards;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || paused || cards.length <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [emblaApi, paused, cards.length]);

  if (isLoading || cards.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -inset-6 rounded-3xl bg-white/10 blur-2xl" />
        <div className="relative rounded-3xl border border-white/20 bg-white/10 p-8 text-center text-white/80 backdrop-blur-xl shadow-glow">
          {isLoading ? (
            <div className="mx-auto h-40 w-full animate-pulse rounded-2xl bg-white/10" />
          ) : (
            <>
              <Sparkles className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-3 font-display text-lg font-bold">Carregando destaques…</p>
            </>
          )}
        </div>
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
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-glow">
        {payload.competicao && (
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-2 text-[10px] uppercase tracking-widest text-white/70">
            <span>{payload.competicao}</span>
            {payload.encerrada && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">ENCERRADA</span>
            )}
          </div>
        )}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {cards.map((c, idx) => (
              <div key={idx} className="min-w-0 flex-[0_0_100%] p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                  <span>{c.emoji}</span>
                  <span>{c.tag}</span>
                </div>

                {c.tipo === "jogo" && (
                  <>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-24">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{c.fc}</div>
                        <p className="break-words text-center text-[13px] font-bold leading-tight sm:text-sm">{c.casa}</p>
                      </div>
                      <div className="min-w-0 flex-1 text-center">
                        <p className="whitespace-nowrap font-display text-2xl font-black sm:text-3xl">{c.placar}</p>
                        {c.detalhe && (
                          <p className="mt-1 text-[10px] uppercase leading-tight text-accent">{c.detalhe}</p>
                        )}
                      </div>
                      <div className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-24">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{c.ff}</div>
                        <p className="break-words text-center text-[13px] font-bold leading-tight sm:text-sm">{c.fora}</p>
                      </div>
                    </div>
                    <p className="mt-4 font-display font-bold">{c.titulo}</p>
                    <p className="mt-1 text-xs text-white/80">{c.texto}</p>
                  </>
                )}

                {c.tipo === "fato" && (
                  <div className="my-4 rounded-2xl bg-accent/15 px-4 py-5 ring-1 ring-accent/30">
                    <p className="break-words text-center font-display text-2xl font-black text-accent sm:text-3xl">{c.destaque}</p>
                    <p className="mt-3 text-center font-display font-bold">{c.titulo}</p>
                    <p className="mt-1 text-center text-xs text-white/80">{c.texto}</p>
                  </div>
                )}

                {c.tipo === "cta" && (
                  <div className="my-4 rounded-2xl bg-accent/15 px-4 py-6 ring-1 ring-accent/30">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-2xl shadow-glow">
                      {c.emoji}
                    </div>
                    <p className="text-center font-display text-lg font-bold">{c.titulo}</p>
                    <p className="mt-1 text-center text-xs text-white/80">{c.texto}</p>
                    <div className="mt-4 flex justify-center">
                      <Link
                        to={c.rota as any}
                        className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-glow"
                      >
                        {c.botao}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {cards.length > 1 && (
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

      {cards.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${selected === i ? "w-6 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
