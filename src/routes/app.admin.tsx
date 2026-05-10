import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/login" });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, ativo")
      .eq("id", sess.session.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || !profile.ativo) {
      setTimeout(() => toast.error("Essa área é só pra admin, peraba."), 0);
      throw redirect({ to: "/app" });
    }
  },
  component: AdminShell,
});
