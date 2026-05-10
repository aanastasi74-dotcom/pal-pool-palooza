import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { times } from "@/lib/mock-data";
import { toast } from "sonner";
import { RotateCcw, Share2, CalendarSearch } from "lucide-react";
import { useMatches } from "@/lib/queries/matches";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/simulador")({
  head: () => ({ meta: [{ title: "Simulador — Bolão dos Perebas" }] }),
  component: Simulador,
});

type State = {
  oitavasWin: (string | null)[];
  quartasWin: (string | null)[];
  semisWin: (string | null)[];
  campeao: string | null;
};

const initialState: State = {
  oitavasWin: Array(8).fill(null),
  quartasWin: Array(4).fill(null),
  semisWin: Array(2).fill(null),
  campeao: null,
};

function Simulador() {
  const { data: matches = [], isLoading } = useMatches();
  const [s, setS] = useState<State>(initialState);

  // Constrói confrontos das oitavas a partir dos matches reais (fase = "Oitavas")
  const oitavasMatches = (matches as any[]).filter((m) => (m.fase ?? "").toLowerCase() === "oitavas").slice(0, 8);
  const oitavasConfrontos: [string, string][] = oitavasMatches.map((m) => [m.casa, m.fora]);

  const pickOitavas = (i: number, time: string) => {
    const next = { ...s, oitavasWin: [...s.oitavasWin] };
    next.oitavasWin[i] = time;
    const qIdx = Math.floor(i / 2);
    next.quartasWin = [...s.quartasWin];
    next.quartasWin[qIdx] = null;
    next.semisWin = [null, null];
    next.campeao = null;
    setS(next);
  };

  const pickQuartas = (i: number, time: string) => {
    const next = { ...s, quartasWin: [...s.quartasWin] };
    next.quartasWin[i] = time;
    const sIdx = Math.floor(i / 2);
    next.semisWin = [...s.semisWin];
    next.semisWin[sIdx] = null;
    next.campeao = null;
    setS(next);
  };

  const pickSemis = (i: number, time: string) => {
    const next = { ...s, semisWin: [...s.semisWin] };
    next.semisWin[i] = time;
    next.campeao = null;
    setS(next);
  };

  const pickFinal = (time: string) => setS({ ...s, campeao: time });

  const quartasConfrontos: [string | null, string | null][] = [
    [s.oitavasWin[0], s.oitavasWin[1]],
    [s.oitavasWin[2], s.oitavasWin[3]],
    [s.oitavasWin[4], s.oitavasWin[5]],
    [s.oitavasWin[6], s.oitavasWin[7]],
  ];
  const semisConfrontos: [string | null, string | null][] = [
    [s.quartasWin[0], s.quartasWin[1]],
    [s.quartasWin[2], s.quartasWin[3]],
  ];
  const finalConfronto: [string | null, string | null] = [s.semisWin[0], s.semisWin[1]];

  const compartilhar = () => {
    if (!s.campeao) {
      toast.error("Escolhe o campeão primeiro, peraba!");
      return;
    }
    const vice = finalConfronto[0] === s.campeao ? finalConfronto[1] : finalConfronto[0];
    const txt = `Meu palpite: ${times[s.campeao]?.nome ?? s.campeao} campeão, derrotando ${times[vice ?? ""]?.nome ?? vice ?? "—"} na final.`;
    navigator.clipboard?.writeText(txt);
    toast.success("Simulação copiada — manda no grupo!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Simulador da Copa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Brinque com o chaveamento. Não vale pontos — só zoeira.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setS(initialState)}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold"
          >
            <RotateCcw className="h-3 w-3" /> Resetar
          </button>
          <button
            onClick={compartilhar}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Share2 className="h-3 w-3" /> Compartilhar
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : oitavasConfrontos.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="Sem jogos cadastrados ainda"
          description="Volte depois que os admins importarem o calendário."
        />
      ) : (
        <>
          <FaseConfrontos
            title="Oitavas"
            confrontos={oitavasConfrontos}
            winners={s.oitavasWin}
            onPick={pickOitavas}
          />
          <FaseConfrontos
            title="Quartas"
            confrontos={quartasConfrontos}
            winners={s.quartasWin}
            onPick={pickQuartas}
          />
          <FaseConfrontos
            title="Semifinais"
            confrontos={semisConfrontos}
            winners={s.semisWin}
            onPick={pickSemis}
          />
          <FaseConfrontos
            title="Final"
            confrontos={[finalConfronto]}
            winners={[s.campeao]}
            onPick={(_, t) => pickFinal(t)}
          />

          <section className="rounded-3xl bg-hero p-6 text-center text-primary-foreground shadow-glow">
            <p className="text-xs uppercase tracking-widest opacity-80">Seu campeão</p>
            <p className="mt-2 font-display text-5xl font-black">{s.campeao ? times[s.campeao]?.bandeira ?? "🏆" : "🏆"}</p>
            <p className="mt-1 font-display text-2xl font-bold">{s.campeao ? times[s.campeao]?.nome ?? s.campeao : "A definir"}</p>
          </section>
        </>
      )}
    </div>
  );
}

function FaseConfrontos({
  title,
  confrontos,
  winners,
  onPick,
}: {
  title: string;
  confrontos: [string | null, string | null][];
  winners: (string | null)[];
  onPick: (i: number, time: string) => void;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {confrontos.map(([a, b], i) => {
          const w = winners[i];
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="grid grid-cols-2 gap-2">
                {[a, b].map((t, j) => (
                  <button
                    key={j}
                    disabled={!t}
                    onClick={() => t && onPick(i, t)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-display font-bold transition ${
                      t && w === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-secondary disabled:opacity-40"
                    }`}
                  >
                    <span className="text-xl">{t ? times[t]?.bandeira ?? "❔" : "❔"}</span>
                    <span className="truncate">{t ? times[t]?.nome ?? t : "Aguardando"}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
