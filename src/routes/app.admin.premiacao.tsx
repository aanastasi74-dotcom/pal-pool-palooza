import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSetting, useUpdateSetting } from "@/lib/queries/settings";
import { usePremio } from "@/lib/queries/premio";
import { useRanking } from "@/lib/queries/profiles";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { isElegivelLanterna, razaoNaoElegivel, REGRA_LANTERNINHA, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/admin/premiacao")({
  head: () => ({ meta: [{ title: "Admin — Premiação" }] }),
  component: PremiacaoAdmin,
});

const fmt = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

type PrizeDistribution = {
  meta_arrecadacao?: number;
  custos?: number;
  campeao_pct?: number;
  vice_pct?: number;
  terceiro_pct?: number;
  lanterninha_pct?: number;
};

const labels = ["1º lugar", "2º lugar", "3º lugar", "Lanterninha"];

function PremiacaoAdmin() {
  const { data: dist } = useSetting<PrizeDistribution>("prize_distribution");
  const { data: premio } = usePremio();
  const update = useUpdateSetting();

  const [meta, setMeta] = useState(5000);
  const [custos, setCustos] = useState(0);
  const [pcts, setPcts] = useState<number[]>([60, 25, 10, 5]);

  useEffect(() => {
    if (!dist) return;
    setMeta(dist.meta_arrecadacao ?? 5000);
    setCustos(dist.custos ?? 0);
    setPcts([dist.campeao_pct ?? 60, dist.vice_pct ?? 25, dist.terceiro_pct ?? 10, dist.lanterninha_pct ?? 5]);
  }, [dist]);

  const soma = pcts.reduce((a, b) => a + b, 0);
  const liquido = Math.max(0, (premio?.total_confirmado ?? 0) - custos);

  const salvar = async () => {
    if (soma !== 100) { toast.error(`Distribuição precisa somar 100% (atual: ${soma}%)`); return; }
    await update.mutateAsync({
      key: "prize_distribution",
      value: { meta_arrecadacao: meta, custos, campeao_pct: pcts[0], vice_pct: pcts[1], terceiro_pct: pcts[2], lanterninha_pct: pcts[3] },
    });
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
              <Slider value={[p]} onValueChange={(v) => setPcts(pcts.map((x, j) => (j === i ? v[0] : x)))} max={100} step={1} />
            </div>
          ))}
        </div>
      </div>

      <PainelLanterna />

      <button onClick={salvar} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow">
        Salvar configuração
      </button>
    </div>
  );
}

function PainelLanterna() {
  const { data: ranking } = useRanking();
  const list = (ranking ?? []).map((q: any) => ({
    id: q.id,
    nome: q.profile?.nome ?? "—",
    pontos: q.pontos ?? 0,
    palpites_validos: q.palpites_validos ?? 0,
    palpites_possiveis: q.palpites_possiveis ?? 0,
  }));
  const ordenado = [...list].sort((a, b) => a.pontos - b.pontos);
  const ultimo = ordenado[0];
  const primeiroElegivel = ordenado.find((p) => isElegivelLanterna(p));
  const elegiveis = list.filter((p) => isElegivelLanterna(p)).length;
  const naoElegiveis = list.length - elegiveis;
  const lanternaCoincide = ultimo && primeiroElegivel && ultimo.id === primeiroElegivel.id;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 rotate-180 text-accent-foreground" />
        <h3 className="font-display font-bold">Regra do lanterninha · 5%</h3>
      </div>
      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{REGRA_LANTERNINHA}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-success/10 p-3">
          <p className="font-display text-2xl font-bold text-success">{elegiveis}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quotas elegíveis</p>
        </div>
        <div className="rounded-xl bg-accent/20 p-3">
          <p className="font-display text-2xl font-bold text-accent-foreground">{naoElegiveis}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quotas não elegíveis</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-left">
            <tr><th className="px-3 py-2">Cenário</th><th className="px-3 py-2">Participante</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-3 py-2 font-semibold">Último colocado</td>
              <td className="px-3 py-2">{ultimo?.nome ?? "—"}</td>
              <td className="px-3 py-2">
                {ultimo && isElegivelLanterna(ultimo) ? (
                  <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Elegível</span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {ultimo ? razaoNaoElegivel(ultimo) : "—"}</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-semibold">Lanterninha elegível</td>
              <td className="px-3 py-2">{primeiroElegivel?.nome ?? "Ninguém"}</td>
              <td className="px-3 py-2">
                {primeiroElegivel ? (
                  <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {primeiroElegivel.pontos} pts · {primeiroElegivel.palpites_validos}/{primeiroElegivel.palpites_possiveis}</span>
                ) : (
                  <span className="text-muted-foreground">Redistribui 67/27/11 entre o pódio</span>
                )}
              </td>
            </tr>
            {!lanternaCoincide && primeiroElegivel && (
              <tr className="bg-accent/10">
                <td className="px-3 py-2 font-semibold">Diferença</td>
                <td className="px-3 py-2 text-muted-foreground">Lanterninha real ≠ elegível</td>
                <td className="px-3 py-2 text-muted-foreground">Prêmio sobe pra {primeiroElegivel.nome}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">Critérios mínimos: {ENGAJAMENTO_MIN * 100}% de palpites válidos e {PONTOS_MIN} pontos.</p>
    </div>
  );
}
