import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useReportsAbertosCount } from "@/lib/queries/reports";
import { Users, Activity, ScrollText, Bug, Settings, Lock, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({ meta: [{ title: "Admin — Plataforma" }] }),
  component: AdminPlataforma,
});

function useCompeticoes() {
  return useQuery({
    queryKey: ["competicoes", "admin-lobby"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competicoes")
        .select("id, slug, nome, nome_curto, formato, status, inicio, fim, quorum_quotas, preco_quota, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const statusStyle: Record<string, string> = {
  arquivada: "bg-muted text-muted-foreground",
  cancelada: "bg-destructive/15 text-destructive",
  rascunho: "bg-muted text-muted-foreground",
  pesquisa: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  inscricoes: "bg-success/15 text-success",
  ativa: "bg-success/15 text-success",
};

const consoleBySlug: Record<string, string> = {
  copa2026: "/app/admin/copa2026",
  champions2627: "/app/admin/champions",
};

const fmtData = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : null);

function AdminPlataforma() {
  const { data: competicoes, isLoading } = useCompeticoes();
  const { data: reportesAbertos = 0 } = useReportsAbertosCount();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Admin da plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">Competições e ferramentas globais.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Competições</h2>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(competicoes ?? []).map((c) => {
              const to = consoleBySlug[c.slug];
              const inner = (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Trophy className="h-4 w-4 shrink-0 text-primary" />
                    <p className="min-w-0 font-display text-base font-bold break-words">{c.nome_curto}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        statusStyle[c.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status === "arquivada" && <Lock className="h-3 w-3" />}
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground break-words">{c.nome}</p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {fmtData(c.inicio) && <span>Início {fmtData(c.inicio)}</span>}
                    {fmtData(c.fim) && <span>Fim {fmtData(c.fim)}</span>}
                    {c.preco_quota != null && <span>Quota R$ {Number(c.preco_quota).toLocaleString("pt-BR")}</span>}
                    {c.quorum_quotas != null && <span>Quórum {c.quorum_quotas}</span>}
                  </div>
                </>
              );
              return to ? (
                <Link
                  key={c.id}
                  to={to}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/60"
                >
                  {inner}
                </Link>
              ) : (
                <div key={c.id} className="rounded-2xl border border-dashed border-border bg-card/50 p-4" title="Console nasce quando sair do rascunho">
                  {inner}
                  <p className="mt-2 text-[11px] italic text-muted-foreground">Console nasce quando sair do rascunho.</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Plataforma</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Atalho to="/app/admin/convites" icon={Users} label="Usuários & convites" desc="Cadastros, convites e aprovações." />
          <Atalho to="/app/admin/saude" icon={Activity} label="Saúde" desc="Diagnóstico do sistema." />
          <Atalho to="/app/admin/auditoria" icon={ScrollText} label="Auditoria" desc="Histórico de ações administrativas." />
          <Atalho to="/app/admin/reportes" icon={Bug} label="Reportes" desc="Bugs reportados pela perebada." badge={reportesAbertos} />
          <Atalho to="/app/admin/configuracoes" icon={Settings} label="Configurações" desc="Chaves e travas globais." />
        </div>
      </section>
    </div>
  );
}

function Atalho({
  to,
  icon: Icon,
  label,
  desc,
  badge,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  badge?: number;
}) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/60">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 font-semibold break-words">{label}</span>
        {badge != null && badge > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground break-words">{desc}</p>
    </Link>
  );
}
