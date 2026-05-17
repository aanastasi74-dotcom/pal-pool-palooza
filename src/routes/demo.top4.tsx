import { createFileRoute } from "@tanstack/react-router";
import { DemoShell, bloqueado } from "@/demo/demo-shell";
import { TOP4_DEMO, getTime } from "@/demo/dados";
import { Award, Lock, Crown, Medal } from "lucide-react";

export const Route = createFileRoute("/demo/top4")({
  head: () => ({ meta: [{ title: "Tour — Top 4" }] }),
  component: DemoTop4,
});

const posicoes = [
  { key: "posicao_1", label: "Campeão", icon: Crown, color: "text-amber-500" },
  { key: "posicao_2", label: "Vice", icon: Medal, color: "text-slate-400" },
  { key: "posicao_3", label: "3º lugar", icon: Medal, color: "text-amber-700" },
  { key: "posicao_4", label: "4º lugar", icon: Award, color: "text-muted-foreground" },
] as const;

function DemoTop4() {
  return (
    <DemoShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2"><Award className="h-7 w-7 text-primary" /> Palpite Top 4</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vale até 4.000 pts. Peso atual do palpite: <strong>{TOP4_DEMO.peso_no_palpite}%</strong>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {posicoes.map(({ key, label, icon: Icon, color }) => {
            const sigla = TOP4_DEMO[key as keyof typeof TOP4_DEMO] as string;
            const time = getTime(sigla);
            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className={`flex items-center gap-2 ${color}`}>
                  <Icon className="h-5 w-5" />
                  <p className="text-xs font-bold uppercase tracking-widest">{label}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-4xl">{time.bandeira}</span>
                  <div>
                    <p className="font-display text-2xl font-extrabold">{time.nome}</p>
                    <p className="text-xs text-muted-foreground">{time.sigla}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Palpite registrado em <strong>{new Date(TOP4_DEMO.alterado_em).toLocaleDateString("pt-BR")}</strong> · fase: {TOP4_DEMO.fase_alteracao}.
        </div>

        <div className="flex justify-end">
          <button onClick={() => bloqueado("alterar Top 4")} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
            <Lock className="h-3.5 w-3.5" /> Alterar palpite
          </button>
        </div>
      </div>
    </DemoShell>
  );
}
