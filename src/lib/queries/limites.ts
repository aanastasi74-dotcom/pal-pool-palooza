import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PerebasCount = { signups: number; convites_pendentes: number; total: number };

export const LIMITE_PEREBAS_HARD = 350;
export const LIMITE_QUOTAS_HARD = 1500;

export function usePerebasCount() {
  return useQuery({
    queryKey: ["perebas-count"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<PerebasCount> => {
      const { data, error } = await (supabase as any).from("vw_perebas_count").select("*").maybeSingle();
      if (error) throw error;
      return data ?? { signups: 0, convites_pendentes: 0, total: 0 };
    },
  });
}

export function useQuotasGlobalCount() {
  return useQuery({
    queryKey: ["quotas-global-count"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quotas")
        .select("id", { count: "exact", head: true })
        .in("status", ["ativa", "aguardando_aprovacao"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function usePodeEmitirConvite() {
  return useQuery({
    queryKey: ["pode-emitir-convite"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("pode_emitir_convite");
      if (error) throw error;
      return data as { pode: boolean; motivo?: string; restantes?: number };
    },
  });
}

export function useUpdateLimiteCustom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, limite }: { user_id: string; limite: number | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ limite_quotas_custom: limite } as any)
        .eq("id", user_id);
      if (error) throw error;
      await supabase.from("audit_log").insert({
        acao: "limite_quotas_custom_update",
        entidade: "profiles",
        entidade_id: user_id,
        payload: { limite_novo: limite } as any,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios-admin"] });
    },
  });
}

export function colorForPct(pct: number): string {
  if (pct >= 95) return "text-destructive";
  if (pct >= 80) return "text-accent";
  return "text-success";
}
