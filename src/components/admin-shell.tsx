import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Trophy,
  CalendarDays,
  Users,
  UserCog,
  Newspaper,
  Settings,
  ScrollText,
  FileBarChart,
  ArrowLeft,
  Menu,
  ShieldCheck,
  Activity,
  Bug,
  Crown,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { PrizeBanner } from "./prize-banner";
import { BugReportFAB } from "./bug-report-fab";
import { MaintenanceBanner } from "./maintenance-banner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const items = [
  { to: "/app/admin", label: "Painel financeiro", icon: LayoutDashboard, exact: true },
  { to: "/app/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/app/admin/quotas", label: "Quotas (recuperação)", icon: ShieldCheck },
  { to: "/app/admin/premiacao", label: "Premiação", icon: Trophy },
  { to: "/app/admin/jogos", label: "Jogos da Copa", icon: CalendarDays },
  { to: "/app/admin/encerrar-copa", label: "Encerrar Copa (Top 4)", icon: Crown },
  { to: "/app/admin/convites", label: "Convites & usuários", icon: Users },
  { to: "/app/admin/perfis", label: "Perfis de personalidade", icon: UserCog },
  { to: "/app/admin/perfis-personalidade", label: "Resumo p/ boletim", icon: UserCog },
  { to: "/app/admin/boletins", label: "Boletins", icon: Newspaper },
  { to: "/app/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/app/admin/auditoria", label: "Auditoria", icon: ScrollText },
  { to: "/app/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/app/admin/saude", label: "Saúde", icon: Activity },
  { to: "/app/admin/reportes", label: "Reportes", icon: Bug },
  { to: "/app/admin/pesquisas", label: "Pesquisas", icon: ClipboardList },
  { to: "/app/admin/sync", label: "Sync placares", icon: RefreshCw },
] as const;

function NavList({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const { to, label, icon: Icon } = item;
        const exact = "exact" in item && item.exact === true;
        const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MaintenanceBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="grid h-9 w-9 place-items-center rounded-md border border-border md:hidden">
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="border-b border-border p-4">
                  <p className="font-display font-bold">Modo admin</p>
                </div>
                <NavList pathname={pathname} onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
                <p className="text-[10px] uppercase tracking-widest text-primary">Modo admin</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/app"
              className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar ao bolão
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <PrizeBanner />

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="sticky top-20 hidden h-fit w-60 shrink-0 rounded-2xl border border-border bg-card shadow-card md:block">
          <NavList pathname={pathname} />
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <BugReportFAB />
    </div>
  );
}
