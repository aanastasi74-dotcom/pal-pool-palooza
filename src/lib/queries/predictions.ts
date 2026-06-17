import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyPredictions(quota_id?: string) {
  return useQuery({
    queryKey: ["predictions", "mine", quota_id],
    enabled: !!quota_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("*").eq("quota_id", quota_id!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllMyPredictions(quota_ids: string[]) {
  const key = [...quota_ids].sort().join(",");
  return useQuery({
    queryKey: ["predictions", "mine-all", key],
    enabled: quota_ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*, quota:quotas!inner(numero)")
        .in("quota_id", quota_ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePredictionsForMatch(match_id?: string) {
  return useQuery({
    queryKey: ["predictions", "match", match_id],
    enabled: !!match_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions").select("*, quota:quotas(numero, user_id, profile:profiles!quotas_user_id_fkey(nome, apelido))")
        .eq("match_id", match_id!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertPrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quota_id, match_id, placar_casa, placar_fora }: { quota_id: string; match_id: string; placar_casa: number | null; placar_fora: number | null }) => {
      const { data: existing } = await supabase
        .from("predictions").select("id").eq("quota_id", quota_id).eq("match_id", match_id).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from("predictions").update({ placar_casa, placar_fora }).eq("id", existing.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("predictions").insert({ quota_id, match_id, placar_casa, placar_fora }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });
}
