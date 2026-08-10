import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  Trophy,
  CalendarDays,
  UserCog,
  Newspaper,
  FileBarChart,
  ShieldCheck,
  Crown,
  RefreshCw,
  ClipboardList,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/copa2026")({
  head: () => ({ meta: [{ title: "Admin — Copa 2026" }] }),
  component: ConsoleCopa2026,
});

const atalhos = [
  { to: "/app/admin/pagamentos", label: "Pagamentos", icon: Wallet, desc: "Comprovantes, aprovações e rejeições." },
  { to: "/app/admin/quotas", label: "Quotas (recuperação)", icon: ShieldCheck, desc: "Recuperar e ajustar quotas da perebada." },
  { to: "/app/admin/premiacao", label: "Premiação", icon: Trophy, desc: "Faixas, premiados e pagamentos do pote." },
  { to: "/app/admin/jogos", label: "Jogos da Copa", icon: CalendarDays, desc: "Placar, fases e travas dos jogos." },
  { to: "/app/admin/encerrar-copa", label: "Encerrar Copa (Top 4)", icon: Crown, desc: "Jornada de encerramento e caixa." },
  { to: "/app/admin/perfis", label: "Perfis de personalidade", icon: UserCog, desc: "Perfis e apelidos usados nos boletins." },
  { to: "/app/admin/boletins", label: "Boletins", icon: Newspaper, desc: "Gerar, editar e publicar boletins." },
  { to: "/app/admin/pesquisas", label: "Pesquisas", icon: ClipboardList, desc: "Builder de pesquisas e resultados." },
  { to: "/app/admin/relatorios", label: "Relatórios", icon: FileBarChart, desc: "Exportações e números da Copa." },
  { to: "/app/admin/sync", label: "Sync placares", icon: RefreshCw, desc: "Sincronização com a API de jogos." },
] as const;

function ConsoleCopa2026() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold break-words">Copa do Mundo 2026</h1>
        <p className="mt-1 text-sm text-muted-foreground">Console operacional da competição.</p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Arquivada — somente leitura.</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
        <span>🏆 Anão #2</span>
        <span>71 perebas</span>
        <span>111 quotas</span>
        <span>pote R$ 5.550</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {atalhos.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 font-semibold break-words">{label}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground break-words">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
