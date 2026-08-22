import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type CardBase = { tipo: string; tag: string; emoji: string; titulo: string; texto: string };
type CardJogo = CardBase & { tipo: "jogo"; casa: string; fora: string; fc: string; ff: string; placar: string; detalhe?: string };
type CardFato = CardBase & { tipo: "fato"; destaque: string };
type Card = CardBase | CardJogo | CardFato;
type Destaques = { competicao: string; encerrada: boolean; cards: Card[] };

async function fetchDestaques(): Promise<Destaques> {
  const { data, error } = await supabase.rpc("destaques_landing");
  if (error) throw error;
  return data as unknown as Destaques;
}

export function VitrineNumeros() {
  const { data, isLoading } = useQuery({
    queryKey: ["destaques-landing"],
    queryFn: fetchDestaques,
    staleTime: 60 * 60 * 1000,
  });

  const cards = (data?.cards ?? []).filter((c) => c.tipo === "jogo" || c.tipo === "fato");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{c.emoji}</span>
            <span className="truncate">{c.tag}</span>
          </p>

          {c.tipo === "jogo" ? (
            <div className="mt-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{(c as CardJogo).fc}</span>
                <span className="font-display text-lg font-black">{(c as CardJogo).placar}</span>
                <span className="text-xl">{(c as CardJogo).ff}</span>
              </div>
              <p className="mt-1 break-words text-center text-[11px] text-muted-foreground">
                {(c as CardJogo).casa} × {(c as CardJogo).fora}
              </p>
            </div>
          ) : (
            <p className="mt-3 break-words text-center font-display text-2xl font-black text-primary">
              {(c as CardFato).destaque}
            </p>
          )}

          <p className="mt-3 break-words font-display text-sm font-bold leading-tight">{c.titulo}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{c.texto}</p>
        </div>
      ))}
    </div>
  );
}
