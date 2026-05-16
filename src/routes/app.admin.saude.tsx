import { createFileRoute } from "@tanstack/react-router";
import { usePaymentsAdmin } from "@/lib/queries/payments";
import { useBulletins } from "@/lib/queries/bulletins";
import { useAuditLog } from "@/lib/queries/audit";
import { useRanking } from "@/lib/queries/profiles";
import { useCapacidadeInfra, type CapacidadeMetrica } from "@/lib/queries/capacidade";
import { Users, Ticket, HardDrive, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/saude")({
  head: () => ({ meta: [{ title: "Admin — Saúde do sistema" }] }),
  component: SaudeAdmin,
});

const corClasses: Record<string, string> = {
  verde: "border-success/40 bg-success/10",
  amarelo: "border-yellow-500/40 bg-yellow-500/10",
  vermelho: "border-destructive/40 bg-destructive/10",
};
const corBadge: Record<string, string> = {
  verde: "bg-success/20 text-success",
  amarelo: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  vermelho: "bg-destructive/20 text-destructive",
};
const corProgress: Record<string, string> = {
  verde: "[&>div]:bg-success",
  amarelo: "[&>div]:bg-yellow-500",
  vermelho: "[&>div]:bg-destructive",
};

function SaudeAdmin() {
  const { data: pays } = usePaymentsAdmin();
  const { data: boletins } = useBulletins();
  const { data: ranking } = useRanking();
  const { data: audits } = useAuditLog();
  const { data: cap, isLoading: capLoading, refetch: refetchCap, isFetching, dataUpdatedAt } = useCapacidadeInfra();

  const ativos = (ranking ?? []).length;
  const pendentes = (pays ?? []).filter((p: any) => p.status === "pendente").length;
  const naoPublicados = (boletins ?? []).filter((b: any) => b.status !== "publicado").length;
  const alertasCapacidade = (audits ?? [])
    .filter((a: any) => /^alerta_capacidade_/.test(a.acao))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Saúde do sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">Capacidade de infra, métricas e alertas recentes.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => refetchCap()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Forçar verificação agora
          </button>
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-muted-foreground">
              Atualizado em {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {capLoading || !cap ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <CapCard
              icon={Users}
              label="Perebas"
              m={cap.metricas.perebas}
              fmt={(m) => `${m.atual ?? 0} / ${m.max ?? 0}`}
            />
            <CapCard
              icon={Ticket}
              label="Quotas"
              m={cap.metricas.quotas}
              fmt={(m) => `${m.atual ?? 0} / ${m.max ?? 0}`}
            />
            <CapCard
              icon={HardDrive}
              label="Storage"
              m={cap.metricas.storage}
              fmt={(m) => `${m.atual_mb ?? 0} MB / ${m.max_mb ?? 0} MB`}
            />
            <CapCard
              icon={Mail}
              label="Emails (mês)"
              m={cap.metricas.emails}
              fmt={(m) => `${m.atual ?? 0} / ${m.max ?? 0}`}
            />
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Quotas ativas" valor={ativos} />
        <Metric label="Pagamentos pendentes" valor={pendentes} />
        <Metric label="Boletins não publicados" valor={naoPublicados} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-base font-bold">Alertas de capacidade recentes</h2>
        <ul className="mt-3 divide-y divide-border">
          {alertasCapacidade.length === 0 && (
            <li className="py-2 text-xs text-muted-foreground">Nenhum alerta de capacidade registrado.</li>
          )}
          {alertasCapacidade.map((a: any) => {
            const nivel = a.acao.replace("alerta_capacidade_", "");
            return (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${corBadge[nivel] ?? ""}`}>
                    {nivel}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function CapCard({
  icon: Icon,
  label,
  m,
  fmt,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  m: CapacidadeMetrica;
  fmt: (m: CapacidadeMetrica) => string;
}) {
  const pct = Math.min(100, Math.round(m.pct ?? 0));
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-card ${corClasses[m.cor] ?? "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${corBadge[m.cor] ?? ""}`}>
          {pct}%
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-black">{fmt(m)}</p>
      <Progress value={pct} className={`mt-2 ${corProgress[m.cor] ?? ""}`} />
    </div>
  );
}

function Metric({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-black">{valor}</p>
    </div>
  );
}
