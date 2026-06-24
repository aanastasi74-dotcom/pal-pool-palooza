import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSimMatches() {
  return useQuery({
    queryKey: ["sim", "matches"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("matches")
        .select(
          "id,numero_jogo,fase,data_jogo,status,team_home_id,team_away_id,casa,fora,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora,eventos,home_origem,away_origem,stadium_id",
        )
        .gte("numero_jogo", 1)
        .lte("numero_jogo", 104)
        .order("numero_jogo", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

export function useFifaRanking() {
  return useQuery({
    queryKey: ["sim", "fifa_ranking"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fifa_ranking")
        .select("team_id,posicao");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.team_id] = r.posicao;
      return map;
    },
    staleTime: 60 * 60_000,
  });
}

export function useAnnexeC() {
  return useQuery({
    queryKey: ["sim", "annexe_c"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("r32_terceiros_combinations")
        .select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60 * 60_000,
  });
}
