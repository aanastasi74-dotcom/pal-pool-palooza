import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LogIn, Trophy } from "lucide-react";
import { DemoTour } from "@/components/demo-tour";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demonstração — Bolão dos Perebas" },
      {
        name: "description",
        content:
          "Veja a plataforma funcionando em 7 passos, com dados reais da Copa do Mundo 2026.",
      },
      { property: "og:title", content: "Demonstração — Bolão dos Perebas" },
      {
        property: "og:description",
        content:
          "7 passos com dados reais: compre quotas, palpite, acompanhe um jogo virando e veja o ranking se mexer.",
      },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Demonstração
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Demonstração interativa
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-5xl">
            Veja a plataforma funcionando
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            7 passos, com dados reais da Copa do Mundo 2026.
          </p>
        </div>

        <div className="mt-10">
          <DemoTour />
        </div>

        <div className="mt-12 flex justify-center">
          {user ? (
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-hero px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-105"
            >
              Ir para o meu bolão <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-hero px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-105"
            >
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
