import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LinhaClassificacao = {
  posicao: number;
  team_id: string;
  team_nome: string;
  bandeira_emoji: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
  pontos: number;
  cartoes_amarelos: number;
  cartoes_segundo_amarelo: number;
  cartoes_vermelhos: number;
  fair_play: number;
  classificado_top2: boolean;
};

export function useClassificacaoGrupos(grupos: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("classificacao-grupos-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        () => {
          qc.invalidateQueries({ queryKey: ["classificacao-grupo"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQueries({
    queries: grupos.map((g) => ({
      queryKey: ["classificacao-grupo", g],
      queryFn: async () => {
        const { data, error } = await (supabase as any).rpc("get_classificacao_grupo", {
          p_grupo: g,
        });
        if (error) throw error;
        return (data ?? []) as LinhaClassificacao[];
      },
      refetchInterval: 30_000,
      staleTime: 15_000,
    })),
  });
}
