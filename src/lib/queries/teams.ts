import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Team = {
  id: string;
  nome_pt: string;
  bandeira_emoji: string;
  grupo: string;
  bracket_position: string;
  confederacao: string | null;
};

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("grupo", { ascending: true })
        .order("bracket_position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamsAgrupados() {
  const q = useTeams();
  const grupos: Record<string, Team[]> = {};
  for (const t of q.data ?? []) (grupos[t.grupo] ||= []).push(t);
  return { ...q, grupos };
}
