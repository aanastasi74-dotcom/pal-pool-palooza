import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { currentUser } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: () => {
    if (currentUser.role !== "admin") {
      // toast roda no client; agendamos via setTimeout pra não chocar com SSR
      if (typeof window !== "undefined") {
        setTimeout(() => toast.error("Essa área é só pra admin, peraba."), 0);
      }
      throw redirect({ to: "/app" });
    }
  },
  component: AdminShell,
});
