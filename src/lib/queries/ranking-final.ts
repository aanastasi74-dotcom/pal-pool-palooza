import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RankingFinalRow = {
  quota_id: string;
  posicao_oficial: number;
  pontos_finais: number;
  elegivel_lanterna: boolean;
  apelido: string;
  numero_quota: number;
  user_id: string | null;
};

export function useRankingFinal() {
  return useQuery({
    queryKey: ["ranking-final"],
    queryFn: async (): Promise<RankingFinalRow[]> => {
      const { data, error } = await (supabase as any)
        .from("ranking_final")
        .select("quota_id,posicao_oficial,pontos_finais,elegivel_lanterna,apelido,numero_quota,user_id")
        .order("posicao_oficial", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RankingFinalRow[];
    },
    staleTime: 60_000,
  });
}
