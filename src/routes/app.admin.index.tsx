import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { pagamentosAdmin, premio } from "@/lib/mock-data";
import { Wallet, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({ meta: [{ title: "Admin — Painel financeiro" }] }),
  component: AdminDashboard,
});

const fmt = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

function AdminDashboard() {
  const aprovados = pagamentosAdmin.filter((p) => p.status === "aprovado");
  const pendentes = pagamentosAdmin.filter((p) => p.status === "pendente");
  const rejeitados = pagamentosAdmin.filter((p) => p.status === "rejeitado");
  const total = aprovados.reduce((s, p) => s + p.valor, 0);
  const totalPend = pendentes.reduce((s, p) => s + p.valor, 0);
  const ticket = aprovados.length ? total / aprovados.length : 0;

  const pieData = [
    { name: "Pago", value: aprovados.length, color: "var(--success)" },
    { name: "Pendente", value: pendentes.length, color: "var(--accent)" },
    { name: "Rejeitado", value: rejeitados.length, color: "var(--destructive)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Resumo da grana da perebada</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pagamentos, prêmio e o que precisa de atenção.</p>
      </div>

      {pendentes.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
          <div className="flex-1">
            <p className="font-bold">Tem comprovante esperando há mais de 48h</p>
            <p className="text-xs text-muted-foreground">{pendentes.length} pagamento(s) pendente(s) — ir conciliar agora.</p>
          </div>
          <Link to="/app/admin/pagamentos" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            Ver pagamentos
          </Link>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <KPI icon={CheckCircle2} label="Total arrecadado" value={fmt(total)} tone="success" />
        <KPI icon={Clock} label="Total pendente" value={fmt(totalPend)} tone="accent" />
        <KPI icon={Wallet} label="Quotas pagas" value={`${aprovados.length}`} />
        <KPI icon={TrendingUp} label="Ticket médio" value={fmt(ticket)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-2">
          <h3 className="font-display font-bold">Aprovações por dia</h3>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <AreaChart data={premio.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="valor" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-bold">Distribuição</h3>
          <p className="text-xs text-muted-foreground">Status dos pagamentos</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={4}>
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Últimas aprovações</h3>
          <Link to="/app/admin/pagamentos" className="text-xs font-bold text-primary hover:underline">Ver todos →</Link>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {aprovados.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-semibold">{p.quota_label}</span>
              <span className="text-xs text-muted-foreground">{p.data} · <b className="text-foreground">{fmt(p.valor)}</b></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: "success" | "accent" }) {
  const colorMap: Record<string, string> = {
    success: "text-success",
    accent: "text-accent",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone ? colorMap[tone] : ""}`} />
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-black">{value}</p>
    </div>
  );
}
