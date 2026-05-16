import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CapacidadeMetrica {
  atual?: number;
  atual_bytes?: number;
  atual_mb?: number;
  max?: number;
  max_bytes?: number;
  max_mb?: number;
  pct: number;
  cor: "verde" | "amarelo" | "vermelho";
}

export interface CapacidadeCheck {
  nivel_geral: "verde" | "amarelo" | "vermelho";
  metricas: {
    perebas: CapacidadeMetrica;
    quotas: CapacidadeMetrica;
    storage: CapacidadeMetrica;
    emails: CapacidadeMetrica;
  };
  thresholds: { amarelo: number; vermelho: number };
  verificado_em: string;
}

export function useCapacidadeInfra() {
  return useQuery({
    queryKey: ["capacidade-infra"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_capacidade" as any);
      if (error) throw error;
      return data as unknown as CapacidadeCheck;
    },
    staleTime: 60_000,
  });
}
