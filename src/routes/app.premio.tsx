import { createFileRoute } from "@tanstack/react-router";
import { premio } from "@/lib/mock-data";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CountUp } from "@/components/count-up";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/premio")({
  head: () => ({
    meta: [
      { title: "Prêmio — Bolão dos Perebas" },
      { name: "description", content: "Acompanhe a evolução do prêmio da perebada em tempo real." },
    ],
  }),
  component: Premio,
});

const fmtBRL = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function Premio() {
  const total = premio.total_confirmado;
  const potencial = premio.total_confirmado + premio.total_pendente;
  const pct = Math.min(100, (total / premio.meta) * 100);
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
        <p className="text-xs text-muted-foreground">Cada quota confirmada engorda o caldeirão.</p>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={premio.evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v}`} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={3} dot={{ fill: "var(--primary)", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Distribuição por colocação</h2>
        <p className="text-xs text-muted-foreground">Pra perebada saber quanto cada lugar leva.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {premio.distribuicao.map((d) => (
            <div key={d.posicao} className={`rounded-2xl border p-5 shadow-card ${d.posicao === 1 ? "border-accent bg-gold text-gold-foreground" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-widest">{d.posicao}º lugar</p>
              </div>
              <p className="mt-3 font-display text-3xl font-black">{d.pct}%</p>
              <p className="mt-1 text-xs opacity-80">≈ {fmtBRL((potencial * d.pct) / 100)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
        <h2 className="font-display text-lg font-bold">Últimas confirmações</h2>
        <ul className="mt-4 divide-y divide-border">
          {premio.ultimasConfirmacoes.map((c, i) => (
            <li key={i} className="flex items-center justify-between py-3 text-sm">
              <span className="font-semibold">{c.quota}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-display font-bold text-foreground">{fmtBRL(c.valor)}</span>
                <span>há {c.ha}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
