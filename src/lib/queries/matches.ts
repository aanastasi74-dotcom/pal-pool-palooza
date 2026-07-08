import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetting } from "@/lib/queries/settings";


export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").order("data_jogo", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMatch(id?: string) {
  return useQuery({
    queryKey: ["matches", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: any) => {
      const { data, error } = await supabase.from("matches").insert(m).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("matches").update(patch).eq("id", id).select().single();
      if (error) throw error;
      if (data?.status === "encerrado" && data.placar_casa != null && data.placar_fora != null) {
        try {
          await supabase.functions.invoke("calcular-pontos", { body: { match_id: id } });
        } catch (e) {
          console.warn("calcular-pontos failed:", e);
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useM104Encerrado() {
  const { data: numeroFinal } = useSetting<number>("jogo_final_numero");
  const numJogo = numeroFinal ?? 104;
  return useQuery({
    queryKey: ["matches", "final-encerrado", numJogo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("status")
        .eq("numero_jogo", numJogo)
        .maybeSingle();
      if (error) throw error;
      return data?.status === "encerrado";
    },
    refetchInterval: 60_000,
  });
}

