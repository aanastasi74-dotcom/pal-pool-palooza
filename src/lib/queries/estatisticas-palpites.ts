import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EstatisticasPalpites = {
  disponivel?: boolean;
  quorum_atingido?: boolean;
  total_palpites?: number;
  total_quotas_ativas?: number;
  motivo_sem_stats?: string;
  motivo?: string;
  placar_mais_apostado?: { casa: number; fora: number; qtd: number };
  percentuais?: { vitoria_casa: number; empate: number; vitoria_fora: number };
  maior_diferenca?: { casa: number; fora: number; diferenca: number; apelido: string; quota_numero: number };
  palpite_do_louco?: { casa: number; fora: number; apelido: string; quota_numero: number };
  error?: string;
};

export type SoVoceAchou = {
  aplicavel: boolean;
  motivo?: string;
  palpite_casa?: number;
  palpite_fora?: number;
  qtd_quotas_mesmo_palpite?: number;
};

export function useEstatisticasPalpites(match_id?: string, enabled = true) {
  return useQuery({
    queryKey: ["estatisticas-palpites", match_id],
    enabled: !!match_id && enabled,
    queryFn: async (): Promise<EstatisticasPalpites> => {
      const { data, error } = await (supabase as any).rpc("get_estatisticas_palpites", { p_match_id: match_id });
      if (error) throw error;
      return (data ?? {}) as EstatisticasPalpites;
    },
  });
}

export function useSoVoceAchouMulti(match_id?: string, quota_ids: string[] = [], enabled = true) {
  return useQueries({
    queries: quota_ids.map((qid) => ({
      queryKey: ["so-voce-achou", match_id, qid],
      enabled: !!match_id && !!qid && enabled,
      queryFn: async (): Promise<SoVoceAchou & { quota_id: string }> => {
        const { data, error } = await (supabase as any).rpc("get_so_voce_achou", {
          p_match_id: match_id,
          p_quota_id: qid,
        });
        if (error) throw error;
        return { ...(data ?? { aplicavel: false }), quota_id: qid };
      },
    })),
  });
}
