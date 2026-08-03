import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/feminina")({
  head: () => ({
    meta: [
      { title: "Copa do Mundo Feminina 2027 — Bolão dos Perebas" },
      { name: "description", content: "A próxima grande resenha da Perebada. Inscrições e regulamento em 2027." },
    ],
  }),
  component: Feminina,
});

function Feminina() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Trophy className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold">Copa do Mundo Feminina 2027</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A próxima grande resenha da Perebada. Inscrições e regulamento em 2027 — aguarde.
      </p>
      <Link to="/app" className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline">
        ← Voltar ao início
      </Link>
    </div>
  );
}
