import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<{ apelido: string; nome: string; cor: string; notificacoes: any }>) => {
      const { data, error } = await supabase.from("profiles").update(patch).eq("id", user!.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["usuarios-admin"] });
    },
  });
}

export function useUsuariosAdmin() {
  return useQuery({
    queryKey: ["usuarios-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, quotas:quotas(count)")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        quotas_count: p.quotas?.[0]?.count ?? 0,
      }));
    },
  });
}

export function useToggleAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, makeAdmin }: { user_id: string; makeAdmin: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", {
        p_user_id: user_id,
        p_role: makeAdmin ? "admin" : "participante",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios-admin"] }),
  });
}

export function useToggleAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, ativo }: { user_id: string; ativo: boolean }) => {
      const { error } = await supabase.rpc("admin_set_ativo", { p_user_id: user_id, p_ativo: ativo });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios-admin"] }),
  });
}

export function useRanking() {
  return useQuery({
    queryKey: ["ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotas")
        .select("id, numero, pontos, posicao, palpites_validos, palpites_possiveis, elegivel_lanterna, user_id, profile:profiles!quotas_user_id_fkey(id, nome, apelido, cor)")
        .eq("status", "ativa")
        .order("pontos", { ascending: false });
      // join may fail if no FK alias; fallback to manual join
      if (error) {
        const { data: quotas, error: e2 } = await supabase
          .from("quotas").select("*").eq("status", "ativa").order("pontos", { ascending: false });
        if (e2) throw e2;
        const ids = Array.from(new Set((quotas ?? []).map((q) => q.user_id)));
        const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
        const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
        return (quotas ?? []).map((q, i) => ({
          ...q,
          posicao: q.posicao ?? i + 1,
          profile: pmap.get(q.user_id) ?? null,
        }));
      }
      return (data ?? []).map((q: any, i) => ({ ...q, posicao: q.posicao ?? i + 1 }));
    },
  });
}
