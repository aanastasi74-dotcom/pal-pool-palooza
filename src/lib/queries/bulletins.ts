import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useBulletins() {
  return useQuery({
    queryKey: ["bulletins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulletins").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBulletinDoDia() {
  return useQuery({
    queryKey: ["bulletins", "do-dia"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bulletins").select("*").in("status", ["agendado", "rascunho", "publicado"])
        .order("created_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
  });
}

export function useCreateBulletin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (b: any) => {
      const { data, error } = await supabase.from("bulletins").insert({ ...b, publicado_por: user?.id ?? null }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulletins"] }),
  });
}

export function useUpdateBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("bulletins").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulletins"] }),
  });
}

export function useDeleteBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bulletins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulletins"] }),
  });
}
