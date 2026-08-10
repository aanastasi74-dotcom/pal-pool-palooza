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
  Home,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { PrizeBanner } from "./prize-banner";
import { BugReportFAB } from "./bug-report-fab";
import { MaintenanceBanner } from "./maintenance-banner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useReportsAbertosCount } from "@/lib/queries/reports";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

const plataformaItems: NavItem[] = [
  { to: "/app/admin", label: "Início", icon: Home, exact: true },
  { to: "/app/admin/convites", label: "Usuários & convites", icon: Users },
  { to: "/app/admin/saude", label: "Saúde", icon: Activity },
  { to: "/app/admin/auditoria", label: "Auditoria", icon: ScrollText },
  { to: "/app/admin/reportes", label: "Reportes", icon: Bug },
  { to: "/app/admin/configuracoes", label: "Configurações", icon: Settings },
];

const copaItems: NavItem[] = [
  { to: "/app/admin/copa2026", label: "Início da Copa", icon: Home, exact: true },
  { to: "/app/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/app/admin/quotas", label: "Quotas (recuperação)", icon: ShieldCheck },
  { to: "/app/admin/premiacao", label: "Premiação", icon: Trophy },
  { to: "/app/admin/jogos", label: "Jogos da Copa", icon: CalendarDays },
  { to: "/app/admin/encerrar-copa", label: "Encerrar Copa (Top 4)", icon: Crown },
  { to: "/app/admin/perfis", label: "Perfis de personalidade", icon: UserCog },
  { to: "/app/admin/boletins", label: "Boletins", icon: Newspaper },
  { to: "/app/admin/pesquisas", label: "Pesquisas", icon: ClipboardList },
  { to: "/app/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/app/admin/sync", label: "Sync placares", icon: RefreshCw },
  { to: "/app/admin", label: "← Plataforma", icon: LayoutDashboard, exact: true },
];

const plataformaPaths = [
  "/app/admin/convites",
  "/app/admin/saude",
  "/app/admin/auditoria",
  "/app/admin/reportes",
  "/app/admin/configuracoes",
  "/app/admin/champions",
];

function isPlataforma(pathname: string) {
  if (pathname === "/app/admin" || pathname === "/app/admin/") return true;
  return plataformaPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function NavList({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  const { data: reportesAbertos = 0 } = useReportsAbertosCount();
  const items = isPlataforma(pathname) ? plataformaItems : copaItems;
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const { to, label, icon: Icon, exact } = item;
        const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
        const badge = to === "/app/admin/reportes" && reportesAbertos > 0 ? reportesAbertos : null;
        return (
          <Link
            key={to + label}
            to={to}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {badge !== null && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}


export function AdminShell() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const plataforma = isPlataforma(pathname);
  const modoLabel = plataforma ? "Admin — Plataforma" : "Admin — Copa 2026 (arquivada)";

  return (
    <div className="min-h-screen bg-background">
      <MaintenanceBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border md:hidden">
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="border-b border-border p-4">
                  <p className="font-display font-bold">{modoLabel}</p>
                </div>
                <NavList pathname={pathname} onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-display text-sm font-bold">Bolão dos Perebas</p>
                <p className="truncate text-[10px] uppercase tracking-widest text-primary">{modoLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/app"
              className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <ArrowLeft className="h-3 w-3" /> <span className="hidden sm:inline">Voltar ao bolão</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {!plataforma && <PrizeBanner />}

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
