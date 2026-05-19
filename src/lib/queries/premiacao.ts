import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PremiacaoResult = {
  quotas_ativas: number;
  faixa: {
    id: number;
    nome: string;
    rotulo: string;
    quotas_min: number;
    quotas_max: number | null;
  } | null;
  proxima_faixa: {
    id: number;
    nome: string;
    rotulo: string;
    quotas_min: number;
    quotas_para_alcancar: number;
  } | null;
  valor_quota: number;
  custos_fixos: number;
  bruta: number;
  liquida: number;
  premios: {
    primeiro_base: number;
    primeiro_bonus: number;
    primeiro_total: number;
    segundo: number;
    terceiro: number;
    quarto: number;
    quinto: number;
    sexto_decimo_cada: number;
    sexto_decimo_total: number;
    lanterninha: number;
    devolucao_total: number;
    devolucao_pos_de: number | null;
    devolucao_pos_ate: number | null;
    devolucao_qts: number;
    devolucao_por_pereba: number;
  };
};

export function usePremiacao() {
  return useQuery({
    queryKey: ["premiacao"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<PremiacaoResult> => {
      const { data: quotas, error: qErr } = await supabase
        .from("quotas")
        .select("status");
      if (qErr) throw qErr;
      const ativas = (quotas ?? []).filter((q: any) => q.status === "ativa").length;
      const { data, error } = await (supabase as any).rpc("calcular_premiacao", {
        p_quotas_ativas: ativas,
      });
      if (error) throw error;
      return data as PremiacaoResult;
    },
  });
}

export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
