import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { premiacaoConfig, premio, ranking } from "@/lib/mock-data";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { isElegivelLanterna, razaoNaoElegivel, REGRA_LANTERNINHA, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/admin/premiacao")({
  head: () => ({ meta: [{ title: "Admin — Premiação" }] }),
  component: PremiacaoAdmin,
});

const fmt = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function PremiacaoAdmin() {
  const [meta, setMeta] = useState(premiacaoConfig.meta);
  const [custos, setCustos] = useState(premiacaoConfig.custos_operacionais);
  const [pcts, setPcts] = useState(premiacaoConfig.distribuicao.map((d) => d.pct));
  const labels = premiacaoConfig.distribuicao.map((d) => d.label);
  const soma = pcts.reduce((a, b) => a + b, 0);
  const liquido = Math.max(0, premio.total_confirmado - custos);

  const salvar = () => {
    if (soma !== 100) {
      toast.error(`Distribuição precisa somar 100% (atual: ${soma}%)`);
      return;
    }
    toast.success("Configurações salvas, peraba-admin.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Configuração da premiação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Meta, custos e como o bolo é dividido.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <label className="text-xs font-bold uppercase text-muted-foreground">Meta visual do prêmio</label>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-xl">R$</span>
            <input type="number" value={meta} onChange={(e) => setMeta(Number(e.target.value))} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-display text-xl font-bold" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <label className="text-xs font-bold uppercase text-muted-foreground">Custos operacionais</label>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-xl">R$</span>
            <input type="number" value={custos} onChange={(e) => setCustos(Number(e.target.value))} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-display text-xl font-bold" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Distribuição percentual</h3>
          <span className={`text-xs font-bold ${soma === 100 ? "text-success" : "text-destructive"}`}>Soma: {soma}%</span>
        </div>
        <div className="mt-4 space-y-5">
          {pcts.map((p, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold">{labels[i]}</span>
                <span className="font-display font-bold">{p}% · {fmt((liquido * p) / 100)}</span>
              </div>
              <Slider
                value={[p]}
                onValueChange={(v) => setPcts(pcts.map((x, j) => (j === i ? v[0] : x)))}
                max={100}
                step={1}
              />
            </div>
          ))}
        </div>
      </div>

      <button onClick={salvar} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow">
        Salvar configuração
      </button>
    </div>
  );
}
