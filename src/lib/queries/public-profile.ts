import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRankingDiario(data?: string) {
  return useQuery({
    queryKey: ["ranking-diario", data ?? "today"],
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any).rpc(
        "get_ranking_diario",
        data ? { p_data: data } : {},
      );
      if (error) throw error;
      return (rows ?? []).map((r: any) => ({
        id: r.quota_id,
        user_id: r.user_id,
        numero: r.quota_numero,
        pontos: Number(r.pontos ?? 0),
        posicao: r.posicao,
        variacao: r.variacao ?? null,
        jec: r.jec ?? 0,
        pex: r.pex ?? 0,
        rdf: r.rdf ?? 0,
        rgm: r.rgm ?? 0,
        rgv: r.rgv ?? 0,
        res: r.res ?? 0,
        jzr: r.jzr ?? 0,
        npt: r.npt ?? 0,
        aproveitamento_pct: r.aproveitamento_pct ?? null,
        top4_p1: r.top4_p1 ?? null,
        top4_p2: r.top4_p2 ?? null,
        top4_p3: r.top4_p3 ?? null,
        top4_p4: r.top4_p4 ?? null,
        top4_peso: r.top4_peso ?? null,
        profile: { id: r.user_id, apelido: r.apelido, cor: r.cor, sigla: r.sigla },
      }));
    },
  });
}

export function usePalpitesPublicosJogos(user_id?: string) {
  return useQuery({
    queryKey: ["palpites-publicos-jogos", user_id],
    enabled: !!user_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_palpites_publicos_jogos", { p_user_id: user_id! });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePalpitesPublicosTop4(user_id?: string) {
  return useQuery({
    queryKey: ["palpites-publicos-top4", user_id],
    enabled: !!user_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_palpites_publicos_top4", { p_user_id: user_id! });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCheckApelido(apelido: string, debounceMs = 500) {
  const trimmed = apelido.trim();
  return useQuery({
    queryKey: ["check-apelido", trimmed.toUpperCase()],
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      // simple debounce via promise delay; React Query dedupes by key
      await new Promise((r) => setTimeout(r, debounceMs));
      const { data, error } = await (supabase as any).rpc("check_apelido_disponivel", { p_apelido: trimmed });
      if (error) throw error;
      return data as boolean;
    },
  });
}
