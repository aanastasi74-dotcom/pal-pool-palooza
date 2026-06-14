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
    mutationFn: async (patch: Partial<{ apelido: string; nome: string; cor: string; sigla: string | null; notificacoes: any }>) => {
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
      const { data, error } = await (supabase as any).rpc("admin_list_usuarios");
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        quotas_count: p.quotas_ativas ?? 0,
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
      const { data, error } = await (supabase as any).rpc("get_ranking_geral");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.quota_id,
        user_id: r.user_id,
        numero: r.numero,
        pontos: r.pontos,
        exatos: r.exatos,
        resultados: r.resultados,
        posicao: r.posicao,
        variacao: r.variacao ?? null,
        palpites_validos: 0,
        palpites_possiveis: 0,
        elegivel_lanterna: false,
        profile: { id: r.user_id, nome: r.nome, apelido: r.apelido, cor: r.cor, sigla: r.sigla },
      }));
    },
  });
}
