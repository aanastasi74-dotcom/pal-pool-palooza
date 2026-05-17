import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, ArrowRight, LogIn } from "lucide-react";

export const Route = createFileRoute("/demo/")({
  head: () => ({ meta: [{ title: "Tour Demo — Bolão dos Perebas" }] }),
  component: DemoLanding,
});

function DemoLanding() {
  return (
    <div className="min-h-screen bg-hero text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <Trophy className="h-8 w-8" />
        </div>
        <span className="mt-6 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
          🎮 Modo demo · sem login
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight md:text-6xl">
          Faça um tour pelo <span className="text-accent">Bolão dos Perebas</span> Copa 2026
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
          Esta é uma simulação. Veja como o bolão funciona antes de pedir seu convite.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/demo/inicio"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-primary shadow-glow transition hover:scale-105"
          >
            Começar tour <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            <LogIn className="h-4 w-4" /> Já me cadastrei, fazer login
          </Link>
        </div>
        <Link to="/" className="mt-12 text-xs text-white/70 underline hover:text-white">
          ← Voltar pra página inicial
        </Link>
      </div>
    </div>
  );
}
