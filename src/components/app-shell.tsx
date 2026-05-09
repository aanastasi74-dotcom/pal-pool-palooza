import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Trophy, CalendarDays, ListOrdered, Sparkles, Coins, ChevronDown, User, Wallet, ShieldCheck, LogOut } from "lucide-react";
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
import { currentUser, minhasQuotas } from "@/lib/mock-data";

const nav: { to: string; label: string; icon: typeof Trophy; exact?: boolean }[] = [
  { to: "/app", label: "Início", icon: Trophy, exact: true },
  { to: "/app/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/app/palpites", label: "Palpites", icon: Sparkles },
  { to: "/app/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/app/premio", label: "Prêmio", icon: Coins },
];

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAdmin = currentUser.role === "admin";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
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
                  <p className="font-semibold">{currentUser.nome}</p>
                  <p className="text-muted-foreground">{minhasQuotas.length} quota{minhasQuotas.length > 1 ? "s" : ""}</p>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-bold text-gold-foreground">
                  {currentUser.apelido}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Olá, peraba!</DropdownMenuLabel>
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
                <DropdownMenuItem onClick={() => navigate({ to: "/app/simulador" })}>
                  <Trophy className="mr-2 h-4 w-4" /> Simulador
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Painel admin (em breve)
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
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
    </div>
  );
}
