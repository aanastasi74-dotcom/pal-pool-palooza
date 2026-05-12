import { createFileRoute } from "@tanstack/react-router";
import { CountUp } from "@/components/count-up";
import { Trophy, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { REGRA_LANTERNINHA } from "@/lib/lanterninha";
import { usePremio } from "@/lib/queries/premio";
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

      <section>
        <h2 className="font-display text-lg font-bold">Distribuição por colocação</h2>
        <p className="text-xs text-muted-foreground">Pódio leva o caldeirão e o lanterninha leva um afago — pra perebada não sair só com a vergonha.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {premio.distribuicao.map((d) => {
            const isPrimeiro = d.id === "primeiro";
            const isLanterna = d.id === "lanterna";
            const Icon = isLanterna ? Lightbulb : Trophy;
            const valor = (premio.total_confirmado * d.pct) / 100;
            return (
              <div
                key={d.id}
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
                  <p className="font-display text-lg font-bold">{d.label}</p>
                </div>
                <p className="mt-3 font-display text-3xl font-black">{d.pct}%</p>
                <p className="mt-1 text-xs opacity-80">≈ {fmtBRL(valor)}</p>
                {isLanterna && (
                  <>
                    <p className="mt-2 text-[11px] italic opacity-80">Vale 5% — para quem palpitou direito até o fim.</p>
                    <button
                      onClick={() => setOpenRegra(true)}
                      className="mt-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Ver regra completa
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
