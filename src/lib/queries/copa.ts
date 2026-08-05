import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePodeCriarQuota() {
  return useQuery({
    queryKey: ["copa", "pode_criar_quota"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pode_criar_quota");
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 60_000,
  });
}

export function useFaseAtualCopa() {
  return useQuery({
    queryKey: ["copa", "fase_atual"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fase_atual_copa");
      if (error) throw error;
      return data as string;
    },
    staleTime: 60_000,
  });
}
