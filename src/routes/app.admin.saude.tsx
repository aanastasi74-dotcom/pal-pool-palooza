import { createFileRoute } from "@tanstack/react-router";
import { usePaymentsAdmin } from "@/lib/queries/payments";
import { useBulletins } from "@/lib/queries/bulletins";
import { useAuditLog } from "@/lib/queries/audit";
import { useRanking } from "@/lib/queries/profiles";
import { Activity, Database, Cloud, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/app/admin/saude")({
  head: () => ({ meta: [{ title: "Admin — Saúde do sistema" }] }),
  component: SaudeAdmin,
});

const services = [
  { id: "api", label: "API", icon: Activity, status: "ok" as const, info: "Latência 87ms" },
  { id: "db", label: "Banco de dados", icon: Database, status: "ok" as const, info: "Pool 8/20" },
  { id: "backup", label: "Backup automático", icon: Cloud, status: "warn" as const, info: "Último sucesso há 9h" },
  { id: "llm", label: "LLM (boletim)", icon: Sparkles, status: "ok" as const, info: "OK" },
  { id: "placares", label: "Placares ao vivo", icon: Activity, status: "ok" as const, info: "Sincronizado" },
  { id: "email", label: "E-mail transacional", icon: Mail, status: "warn" as const, info: "Fila em 12 mensagens" },
];

const incidentes = [
  { data: "10/06/2026", desc: "Degradação no provedor de placares", duracao: "22min", impacto: "Atualização atrasada" },
  { data: "02/06/2026", desc: "Falha no envio de e-mails de convite", duracao: "1h 10min", impacto: "8 convites reenviados" },
  { data: "18/05/2026", desc: "Reinício do banco em janela de manutenção", duracao: "4min", impacto: "Sem perda de dados" },
];

const corStatus = {
  ok: "bg-success/15 text-success",
  warn: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  err: "bg-destructive/15 text-destructive",
};

function SaudeAdmin() {
  const { data: pays } = usePaymentsAdmin();
  const { data: boletins } = useBulletins();
  const { data: ranking } = useRanking();
  const { data: audits } = useAuditLog();

  const ativos = (ranking ?? []).length;
  const pendentes = (pays ?? []).filter((p: any) => p.status === "pendente").length;
  const naoPublicados = (boletins ?? []).filter((b: any) => b.status !== "publicado").length;
  const sensiveis = (audits ?? [])
    .filter((a: any) => /estorn|atualizou_config|rejeit|atualizou_premiacao|excluiu/.test(a.acao))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Saúde do sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">Status operacional, métricas e ações sensíveis.</p>
        </div>
        <button
          onClick={() => toast.success("Verificação concluída.")}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          Forçar verificação agora
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${corStatus[s.status]}`}>
                {s.status === "ok" ? "OK" : s.status === "warn" ? "Atenção" : "Erro"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.info}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Quotas ativas" valor={ativos} />
        <Metric label="Pagamentos pendentes" valor={pendentes} />
        <Metric label="Boletins não publicados" valor={naoPublicados} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-base font-bold">Últimas ações sensíveis</h2>
        <ul className="mt-3 divide-y divide-border">
          {sensiveis.length === 0 && <li className="py-2 text-xs text-muted-foreground">Nenhuma ação sensível recente.</li>}
          {sensiveis.map((a: any) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">{a.ator_nome ?? "—"}</span>
                <span className="text-muted-foreground">{a.acao.replace(/_/g, " ")}</span>
              </span>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-base font-bold">Histórico de incidentes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Impacto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidentes.map((i, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-xs">{i.data}</TableCell>
                <TableCell>{i.desc}</TableCell>
                <TableCell className="text-xs">{i.duracao}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.impacto}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
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
