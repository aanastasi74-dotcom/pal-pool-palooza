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

// N.38: fase do Top 4 é calculada por prazos absolutos (não mais via RPC).
// Prazos oficiais §8:
//  - antes_copa  : até 2026-06-11 16:00 BRT (100%)
//  - grupos      : até 2026-06-28 12:00 BRT (50%)
//  - round_32    : até 2026-07-04 12:00 BRT (25%)
//  - depois      : 'oitavas' (palpite travado)
export const TOP4_INICIO_COPA = new Date("2026-06-11T16:00:00-03:00");
export const TOP4_DEADLINE_GRUPOS = new Date("2026-06-28T12:00:00-03:00");
export const TOP4_DEADLINE_R32 = new Date("2026-07-04T12:00:00-03:00");

export function calcularFaseTop4(agora: Date = new Date()): string {
  if (agora < TOP4_INICIO_COPA) return "antes_copa";
  if (agora < TOP4_DEADLINE_GRUPOS) return "grupos";
  if (agora < TOP4_DEADLINE_R32) return "round_32";
  return "oitavas";
}

export function useTop4Pontos(quota_id?: string) {
  return useQuery({
    queryKey: ["top4-pontos", quota_id],
    enabled: !!quota_id,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("top4_predictions")
        .select("pontos_calculados")
        .eq("quota_id", quota_id!)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.pontos_calculados ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function useFaseAtual() {
  return useQuery({
    queryKey: ["fase-atual"],
    queryFn: async () => calcularFaseTop4(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

