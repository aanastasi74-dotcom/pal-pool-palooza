import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Trophy, CalendarDays, ListOrdered, Sparkles } from "lucide-react";

const nav = [
  { to: "/app", label: "Início", icon: Trophy },
  { to: "/app/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/app/palpites", label: "Palpites", icon: Sparkles },
  { to: "/app/ranking", label: "Ranking", icon: ListOrdered },
];

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão da Galera</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Copa 2026</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
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
          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right text-xs">
              <p className="font-semibold">Você</p>
              <p className="text-muted-foreground">2 quotas</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold font-bold text-gold-foreground">VC</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium ${
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
