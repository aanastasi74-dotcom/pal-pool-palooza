import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/app/simulador")({
  head: () => ({ meta: [{ title: "Simulador — Bolão dos Perebas" }] }),
  component: SimuladorEmConstrucao,
});

function SimuladorEmConstrucao() {
  return (
    <div className="mx-auto grid max-w-md place-items-center py-20 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-3xl bg-secondary text-5xl shadow-card">
        <Wrench className="h-12 w-12 text-primary" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold">Simulador em construção</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Estamos preparando uma simulação completa dos cruzamentos do mata-mata. Disponível em breve! 🍿
      </p>
    </div>
  );
}
