import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WrappedData = {
  apelido: string;
  total_quotas_bolao: number;
  frase_cronista: string | null;
  abertura: {
    n_quotas: number;
    palpites_feitos: number;
    primeiro_palpite: string | null;
    dias_de_bolao: number;
  };
  estilo: {
    placar_favorito: string | null;
    vezes_placar_favorito: number | null;
    pct_placar_favorito: number | null;
    media_gols_por_palpite: number | null;
    pct_empates: number | null;
  };
  cravadas: {
    total: number;
    melhor_quota: {
      quota_numero: number;
      cravadas: number;
      palpites: number;
      pct: number;
    } | null;
    media_por_quota: number | null;
    aproveitamento_medio_pct: number | null;
    ouro: {
      jogo: string;
      placar: string;
      quota_numero: number | null;
      quotas_que_acertaram: number;
    } | null;
  };
  trajetoria: {
    series: Array<{ quota_numero: number; serie: Array<{ d: string; p: number }> }>;
    melhor_posicao: number | null;
    pior_posicao: number | null;
  };
  top4s: Array<{
    quota_numero: number;
    escolhas: string[]; // slot codes like GH1
    peso_no_palpite: number;
    pontos: number;
  }>;
  zebra: {
    jogo: string;
    palpite: string;
    real: string;
    peso_do_jogo: number;
    quota_numero: number | null;
    pct_perebada_pontuou: number | null;
  } | null;
  ranking: {
    posicao: number | null;
    pontos: number | null;
    quota_numero: number | null;
    total_quotas: number;
    oficial: boolean;
    premiado_categoria: string | null;
  };
  quotas_resumo: Array<{ quota_numero: number; posicao: number | null; pontos: number | null }>;
  citacoes_boletim: number;
};


/** Lê o setting wrapped_liberado (jsonb boolean). Se ausente/false, retorna false. */
export function useWrappedLiberado() {
  return useQuery({
    queryKey: ["settings", "wrapped_liberado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "wrapped_liberado")
        .maybeSingle();
      if (error) throw error;
      return data?.value === true;
    },
    staleTime: 60_000,
  });
}

export type WrappedResult =
  | { status: "ok"; data: WrappedData }
  | { status: "indisponivel" }
  | { status: "erro"; message: string };

export function useWrapped(userId?: string) {
  return useQuery<WrappedResult>({
    queryKey: ["wrapped_do_pereba", userId ?? null],
    queryFn: async () => {
      const args = userId ? ({ p_user_id: userId } as any) : (undefined as any);
      const { data, error } = await supabase.rpc("wrapped_do_pereba" as any, args);
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("wrapped_indisponivel") || msg.includes("forbidden")) {
          return { status: "indisponivel" };
        }
        return { status: "erro", message: msg };
      }
      return { status: "ok", data: data as unknown as WrappedData };
    },
    retry: false,
    staleTime: 30_000,
  });
}
