import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";

export const Route = createFileRoute("/manutencao")({
  head: () => ({ meta: [{ title: "Em manutenção — Bolão dos Perebas" }] }),
  component: Manutencao,
});

function Manutencao() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem("perebas:maintenance") !== "1") {
        navigate({ to: "/" });
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [navigate]);

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
        <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Verificando a cada 30 segundos…
        </p>
        <Link to="/" className="mt-6 inline-block rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary">
          Voltar à landing
        </Link>
      </div>
    </div>
  );
}
