import { createFileRoute } from "@tanstack/react-router";
import { CountUp } from "@/components/count-up";
import { Trophy, Lightbulb, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { REGRA_LANTERNINHA } from "@/lib/lanterninha";
import { usePremio } from "@/lib/queries/premio";
import { usePremiacao, fmtBRL as fmtBRLPrem } from "@/lib/queries/premiacao";
import { usePremiados, CATEGORIA_META, CategoriaPremiado } from "@/lib/queries/premiados";
import { useSetting } from "@/lib/queries/settings";
import { useRecentApprovedPayments } from "@/lib/queries/payments";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/premio")({
  head: () => ({
    meta: [
      { title: "Prêmio — Bolão dos Perebas" },
      { name: "description", content: "Acompanhe a evolução do prêmio da perebada em tempo real." },
    ],
  }),
  component: PremioPage,
});

const fmtBRL = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function PremioPage() {
  const [openRegra, setOpenRegra] = useState(false);
  const { data: premio, isLoading } = usePremio();
  const { data: ultimas = [] } = useRecentApprovedPayments(10);

  if (isLoading || !premio) {
    return <Skeleton className="h-96 w-full" />;
  }

  const total = premio.total_confirmado;
  const potencial = premio.total_confirmado + premio.total_pendente;
  const pct = premio.meta > 0 ? Math.min(100, (total / premio.meta) * 100) : 0;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-10">
        <p className="text-xs uppercase tracking-widest opacity-80">Prêmio confirmado da perebada</p>
        <p className="mt-2 font-display text-5xl font-black md:text-7xl">
          <CountUp value={total} format={fmtBRL} />
        </p>
        <p className="mt-2 text-sm opacity-90">
          Potencial com pendentes: <span className="font-bold">{fmtBRL(potencial)}</span> · meta {fmtBRL(premio.meta)}
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-80">
          {premio.quotas_pagas} de {premio.quotas_pagas + premio.quotas_pendentes} quotas confirmadas · {pct.toFixed(0)}% da meta
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
        <h2 className="font-display text-lg font-bold">Evolução do prêmio</h2>
        <p className="mt-2 text-sm text-muted-foreground">Histórico ainda não tem dados, pereba.</p>
      </section>

      <DistribuicaoPorColocacao onOpenRegra={() => setOpenRegra(true)} />


      <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
        <h2 className="font-display text-lg font-bold">Últimas confirmações</h2>
        {ultimas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma confirmação ainda — esperando a perebada.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(ultimas as any[]).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-semibold">
                  {c.profile?.apelido ?? c.profile?.nome ?? "Pereba"} #{c.quota?.numero ?? "—"}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-display font-bold text-foreground">{fmtBRL(Number(c.valor))}</span>
                  <span>{c.aprovado_em ? new Date(c.aprovado_em).toLocaleDateString("pt-BR") : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={openRegra} onOpenChange={setOpenRegra}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Regra do prêmio do lanterninha</DialogTitle>
            <DialogDescription>Como funciona o prêmio de 5% pro último colocado.</DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {REGRA_LANTERNINHA}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DistCard = {
  key: string;
  label: string;
  valor: number;
  sublabel?: string;
  variant: "primeiro" | "podio" | "extra" | "devolucao" | "lanterna";
  vencedor?: string;
  categoria?: CategoriaPremiado;
};

function DistribuicaoPorColocacao({ onOpenRegra }: { onOpenRegra: () => void }) {
  const { data, isLoading } = usePremiacao();
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: premiados = [] } = usePremiados();

  if (isLoading || !data) {
    return <Skeleton className="h-48 w-full rounded-3xl" />;
  }

  const winnerLabel = (cat: CategoriaPremiado): string | undefined => {
    if (!copaEncerrada) return undefined;
    const p = premiados.find((x) => x.categoria === cat);
    if (!p) return undefined;
    return `${p.apelido} · #${p.numero_quota}`;
  };



  const { premios, bruta, proxima_faixa } = data;
  const pct = (v: number) => (bruta > 0 ? (v / bruta) * 100 : 0);
  const cards: DistCard[] = [];

  cards.push({
    key: "1",
    label: "1º colocado",
    valor: premios.primeiro_total,
    sublabel:
      premios.primeiro_bonus > 0
        ? `inclui ${fmtBRLPrem(premios.primeiro_bonus)} de bônus de sobra`
        : undefined,
    variant: "primeiro",
    vencedor: winnerLabel("primeiro"),
    categoria: "primeiro",
  });
  cards.push({ key: "2", label: "2º colocado", valor: premios.segundo, variant: "podio", vencedor: winnerLabel("segundo"), categoria: "segundo" });
  cards.push({ key: "3", label: "3º colocado", valor: premios.terceiro, variant: "podio", vencedor: winnerLabel("terceiro"), categoria: "terceiro" });
  if (premios.quarto > 0) cards.push({ key: "4", label: "4º colocado", valor: premios.quarto, variant: "extra", vencedor: winnerLabel("quarto"), categoria: "quarto" });
  if (premios.quinto > 0) cards.push({ key: "5", label: "5º colocado", valor: premios.quinto, variant: "extra", vencedor: winnerLabel("quinto"), categoria: "quinto" });
  if (premios.sexto_decimo_cada > 0) {
    cards.push({
      key: "6-10",
      label: "6º–10º (cada)",
      valor: premios.sexto_decimo_cada,
      sublabel: `total ${fmtBRLPrem(premios.sexto_decimo_total)}`,
      variant: "extra",
    });
  }
  if (premios.devolucao_total > 0 && premios.devolucao_pos_de) {
    const ate = premios.devolucao_pos_de + premios.devolucao_qts - 1;
    cards.push({
      key: "devolucao",
      label: `Devolução · ${premios.devolucao_pos_de}º–${ate}º`,
      valor: premios.devolucao_por_pereba,
      sublabel: `${fmtBRLPrem(premios.devolucao_por_pereba)} pra cada · ${premios.devolucao_qts} perebas`,
      variant: "devolucao",
    });
  }
  cards.push({ key: "lanterna", label: "Lanterninha", valor: premios.lanterninha, variant: "lanterna", vencedor: winnerLabel("lanterninha"), categoria: "lanterninha" });

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Distribuição por colocação</h2>
      <p className="text-xs text-muted-foreground">
        Quem chega lá em cima leva o caldeirão; o lanterninha leva um afago — pra perebada não sair só com a vergonha.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => {
          const isPrimeiro = c.variant === "primeiro";
          const isLanterna = c.variant === "lanterna";
          const isDevolucao = c.variant === "devolucao";
          const Icon = isLanterna ? Lightbulb : isDevolucao ? Users : Trophy;
          return (
            <div
              key={c.key}
              className={`rounded-2xl border p-5 shadow-card ${
                isPrimeiro
                  ? "border-accent bg-gold text-gold-foreground"
                  : isLanterna
                    ? "border-dashed border-muted-foreground/40 bg-muted/40"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${isLanterna ? "rotate-180" : ""}`} />
                <p className="font-display text-lg font-bold">{c.label}</p>
              </div>
              <p className="mt-3 font-display text-3xl font-black">{pct(c.valor).toFixed(0)}%</p>
              <p className="mt-1 text-xs opacity-80">{fmtBRLPrem(c.valor)}</p>
              {c.sublabel && <p className="mt-1 text-[11px] opacity-80">{c.sublabel}</p>}
              {isLanterna && (
                <button
                  onClick={onOpenRegra}
                  className="mt-2 text-[11px] font-semibold text-primary hover:underline"
                >
                  Ver regra completa
                </button>
              )}
            </div>
          );
        })}
      </div>
      {proxima_faixa && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="font-bold leading-tight">
            Faltam {proxima_faixa.quotas_para_alcancar} quota{proxima_faixa.quotas_para_alcancar === 1 ? "" : "s"} pra próxima faixa ({proxima_faixa.nome})
          </p>
        </div>
      )}
    </section>
  );
}
