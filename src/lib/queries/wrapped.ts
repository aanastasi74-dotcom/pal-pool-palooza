import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WrappedData = {
  apelido: string;
  total_quotas_bolao: number;
  abertura: {
    n_quotas: number;
    palpites_feitos: number;
    primeiro_palpite: string | null;
    dias_de_bolao: number;
  };
  estilo: {
    placar_favorito: string | null;
    media_gols_por_palpite: number | null;
    pct_empates: number | null;
  };
  cravadas: {
    total: number;
    ouro: {
      jogo: string;
      placar: string;
      quotas_que_acertaram: number;
    } | null;
  };
  trajetoria: {
    quota_numero: number | null;
    serie: Array<{ d: string; p: number }>;
    melhor_posicao: number | null;
    pior_posicao: number | null;
  };
  top4: {
    escolhas: string[];
    peso_no_palpite: number;
    pontos: number;
  } | null;
  zebra: {
    jogo: string;
    palpite: string;
    real: string;
    peso_do_jogo: number;
  } | null;
  ranking: {
    posicao: number | null;
    pontos: number | null;
    total_quotas: number;
    oficial: boolean;
    premiado_categoria: string | null;
  };
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
