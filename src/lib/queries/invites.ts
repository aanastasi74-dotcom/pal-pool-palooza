import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invites").select("*").order("enviado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ nome, email, mensagem }: { nome: string; email: string; mensagem?: string | null }) => {
      const { data, error } = await supabase
        .from("invites").insert({ nome, email, mensagem: mensagem ?? null, criado_por: user?.id ?? null })
        .select("id, token").single();
      if (error) throw error;
      const fnRes = await supabase.functions.invoke("send-convite-email", { body: { invite_id: data.id } });
      return { invite: data, emailError: fnRes.error };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").update({ status: "revogado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("send-convite-email", { body: { invite_id: id } });
      if (error) throw error;
    },
  });
}
