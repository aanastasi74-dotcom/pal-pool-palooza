import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — Bolão dos Perebas" },
      { name: "description", content: "Faça um tour pelo Bolão dos Perebas Copa 2026 sem precisar de convite." },
    ],
  }),
  component: () => <Outlet />,
});
