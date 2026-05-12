import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const STATUS_VISIVEIS = ["aguardando_aprovacao", "ativa", "rejeitada"] as const;

export function useMinhasQuotas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quotas", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotas")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", STATUS_VISIVEIS as unknown as string[])
        .order("numero", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateQuota() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data: pode, error: errPode } = await (supabase as any).rpc("pode_criar_quota");
      if (errPode) throw errPode;
      if (pode === false) {
        throw new Error("As quotas foram encerradas — a Copa já começou. Boa sorte aos perebas inscritos! 🍀");
      }
      // Reaproveita incompleta existente (sem comprovante enviado)
      const { data: incompleta } = await supabase
        .from("quotas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "incompleta")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (incompleta) return incompleta;

      const { data, error } = await supabase
        .from("quotas")
        .insert({ user_id: user!.id, numero: null as any, status: "incompleta" as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotas"] }),
  });
}

export function useQuotasAdmin() {
  return useQuery({
    queryKey: ["quotas", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const TOTAL_QUOTAS_KEY = ["quotas", "total"] as const;
export function useTotalQuotas() {
  return useQuery({
    queryKey: TOTAL_QUOTAS_KEY,
    queryFn: async () => {
      const { count, error } = await supabase.from("quotas").select("id", { count: "exact", head: true }).eq("status", "ativa");
      if (error) throw error;
      return count ?? 0;
    },
  });
}
