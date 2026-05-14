import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// I.5.6 — encerradas escondidas dos dropdowns de palpite/top4 por padrão.
// Quem precisa ver tudo (página de quotas/perfil) passa { includeEncerradas: true }.
const STATUS_ATIVOS = ["aguardando_aprovacao", "ativa", "rejeitada"] as const;
const STATUS_TODOS = ["aguardando_aprovacao", "ativa", "rejeitada", "encerrada"] as const;

export function useMinhasQuotas(opts?: { includeEncerradas?: boolean }) {
  const includeEncerradas = !!opts?.includeEncerradas;
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quotas", "mine", user?.id, includeEncerradas ? "all" : "ativas"],
    enabled: !!user?.id,
    queryFn: async () => {
      const list = (includeEncerradas ? STATUS_TODOS : STATUS_ATIVOS) as unknown as string[];
      const { data, error } = await supabase
        .from("quotas")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", list)
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
      const { data: podeBuy, error: errBuy } = await (supabase as any).rpc("pode_comprar_quota", { p_user_id: user!.id });
      if (errBuy) throw errBuy;
      if (podeBuy && podeBuy.pode === false) {
        throw new Error(podeBuy.motivo ?? "Você não pode comprar mais quotas no momento.");
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
