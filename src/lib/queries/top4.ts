import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyTop4(quota_id?: string) {
  return useQuery({
    queryKey: ["top4", quota_id],
    enabled: !!quota_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("top4_predictions").select("*").eq("quota_id", quota_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateTop4() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quota_id, posicao_1, posicao_2, posicao_3, posicao_4 }: { quota_id: string; posicao_1: string; posicao_2: string; posicao_3: string; posicao_4: string }) => {
      const { data: existing } = await supabase.from("top4_predictions").select("id").eq("quota_id", quota_id).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from("top4_predictions").update({ posicao_1, posicao_2, posicao_3, posicao_4 }).eq("id", existing.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("top4_predictions").insert({ quota_id, posicao_1, posicao_2, posicao_3, posicao_4 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["top4"] }),
  });
}

export function useFaseAtual() {
  return useQuery({
    queryKey: ["fase-atual"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fase_atual_copa");
      if (error) throw error;
      return (data as string) ?? "antes_copa";
    },
    staleTime: 60_000,
  });
}
