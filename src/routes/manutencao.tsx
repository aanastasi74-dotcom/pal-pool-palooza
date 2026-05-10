import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/manutencao")({
  head: () => ({ meta: [{ title: "Em manutenção — Bolão dos Perebas" }] }),
  component: Manutencao,
});

function Manutencao() {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-hero shadow-glow">
          <Trophy className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Voltamos em alguns minutos, perebada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tá rolando uma manutenção rapidinha. Assim que liberar a gente volta com tudo.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Estimativa: ~15 minutos</p>
        <Link to="/" className="mt-6 inline-block rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary">
          Voltar à landing
        </Link>
      </div>
    </div>
  );
}
