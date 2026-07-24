import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin/perfis-personalidade")({
  beforeLoad: () => {
    throw redirect({ to: "/app/admin/perfis" });
  },
});
