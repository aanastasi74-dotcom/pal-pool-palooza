import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePersonalityProfiles() {
  return useQuery({
    queryKey: ["personality"],
    queryFn: async () => {
      const { data, error } = await supabase.from("personality_profiles").select("*").order("apelido_principal");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePersonalityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await supabase.from("personality_profiles").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personality"] }),
  });
}

export function useUpdatePersonalityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("personality_profiles").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personality"] }),
  });
}

export function useDeletePersonalityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personality_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personality"] }),
  });
}
