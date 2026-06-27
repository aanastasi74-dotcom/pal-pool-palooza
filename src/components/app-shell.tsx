import { Link, Outlet, useLocation, useNavigate, Navigate } from "@tanstack/react-router";
import { Trophy, CalendarDays, ListOrdered, Sparkles, Coins, ChevronDown, User, Wallet, ShieldCheck, LogOut, Globe, Building2, Award, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrizeBanner } from "./prize-banner";
import { ThemeToggle } from "./theme-toggle";
import { BugReportFAB } from "./bug-report-fab";
import { MaintenanceBanner } from "./maintenance-banner";
import { EsclarecimentoEmpateDialog } from "./esclarecimento-empate-dialog";
import { AjustePrazosTop4Dialog } from "./ajuste-prazos-top4-dialog";
import { BoasVindasCopaDialog } from "./boas-vindas-copa-dialog";
import { useMaintenanceMode } from "@/hooks/use-maintenance";
import { useAuth } from "@/lib/auth-context";
import { useMinhasQuotas } from "@/lib/queries/quotas";

const nav = [
  { to: "/app", label: "Início", icon: Trophy, exact: true },
  { to: "/app/jogos", label: "Jogos", icon: CalendarDays, exact: false },
  { to: "/app/palpites", label: "Palpites", icon: Sparkles, exact: false },
  { to: "/app/palpites/top4", label: "Top 4", icon: Award, exact: false },
  { to: "/app/ranking", label: "Ranking", icon: ListOrdered, exact: false },
  { to: "/app/premio", label: "Prêmio", icon: Coins, exact: false },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, profile, isLoading } = useAuth();
  const { data: minhasQuotas = [] } = useMinhasQuotas();
  const { maintenance } = useMaintenanceMode();
  const nome = profile?.nome ?? "Pereba";
  const sigla = (profile?.sigla ?? profile?.apelido ?? nome).slice(0, 3).toUpperCase();

  if (!isLoading && !profile) {
    return <Navigate to="/completar-perfil" />;
  }

  if (maintenance && !pathname.startsWith("/app/admin")) {
    return <Navigate to="/manutencao" />;
  }

  // Gate: pereba sem aceite do regulamento é forçado a aceitar
  const aceitouRegras = !!(profile as any)?.aceitou_regras_em;
  if (profile && !aceitouRegras && !isAdmin) {
    return <Navigate to="/regras" search={{ force: true }} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <MaintenanceBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Copa 2026</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 transition hover:bg-secondary">
                <div className="hidden text-right text-xs leading-tight md:block">
                  <p className="font-semibold">{nome}</p>
                  <p className="text-muted-foreground">{minhasQuotas.length} quota{minhasQuotas.length === 1 ? "" : "s"}</p>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">
                  {sigla}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Olá, pereba!</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/app/perfil" })}>
                  <User className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/quotas" })}>
                  <Wallet className="mr-2 h-4 w-4" /> Minhas quotas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/boletins" })}>
                  <Sparkles className="mr-2 h-4 w-4" /> Boletins
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/times" })}>
                  <Globe className="mr-2 h-4 w-4" /> Times da Copa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/estadios" })}>
                  <Building2 className="mr-2 h-4 w-4" /> Estádios
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/app/simulador" })}>
                  <Trophy className="mr-2 h-4 w-4" /> Simulador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/regras" })}>
                  <FileText className="mr-2 h-4 w-4" /> Regulamento
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/app/admin" })}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Painel admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <PrizeBanner />

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-1 py-2">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <BugReportFAB />
      {profile && <BoasVindasCopaDialog />}
      {profile && <EsclarecimentoEmpateDialog />}
      {profile && <AjustePrazosTop4Dialog />}
    </div>
  );
}
