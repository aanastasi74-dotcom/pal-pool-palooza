import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Stadium = {
  id: string;
  nome: string;
  cidade: string;
  pais: "EUA" | "Canadá" | "México";
  fuso_horario: string;
};

export function useStadiums() {
  return useQuery({
    queryKey: ["stadiums"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stadiums")
        .select("*")
        .order("pais", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Stadium[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
