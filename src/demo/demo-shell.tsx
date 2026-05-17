import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Trophy, CalendarDays, Sparkles, Award, ListOrdered, Home, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const nav = [
  { to: "/demo/inicio", label: "Início", icon: Home },
  { to: "/demo/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/demo/palpites", label: "Palpites", icon: Sparkles },
  { to: "/demo/top4", label: "Top 4", icon: Award },
  { to: "/demo/ranking", label: "Ranking", icon: ListOrdered },
] as const;

export function bloqueado(acao = "esta ação") {
  toast.info(`Modo demo — ${acao} só está disponível com convite real.`);
}

export function DemoShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Banner modo demo */}
      <div className="sticky top-0 z-50 border-b border-amber-300/60 bg-amber-100 dark:bg-amber-950/60 dark:border-amber-700/60 px-3 py-2 text-center text-xs font-medium text-amber-900 dark:text-amber-100">
        🎮 <strong>MODO DEMO</strong> — Nada aqui é real.{" "}
        <Link to="/" className="underline hover:text-amber-700">
          Volte pra página inicial
        </Link>{" "}
        ou{" "}
        <Link to="/" hash="como-funciona" className="underline hover:text-amber-700">
          peça convite a um admin
        </Link>
        .
      </div>

      <header className="sticky top-[34px] z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/demo" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tour · Copa 2026</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
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
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Sair do tour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-1 py-2">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
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

      {/* Floating CTA */}
      <Link
        to="/"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 rounded-full bg-hero px-5 py-3 text-xs font-bold text-primary-foreground shadow-glow transition hover:scale-105"
      >
        Curtiu? Voltar pra página inicial →
      </Link>
    </div>
  );
}
