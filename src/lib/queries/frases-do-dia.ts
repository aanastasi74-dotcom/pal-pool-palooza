import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function todayBRT(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export function useFrasesDoDia() {
  return useQuery({
    queryKey: ["frases_do_dia", todayBRT()],
    queryFn: async () => {
      const data = todayBRT();
      const { data: rows, error } = await supabase
        .from("frases_do_dia" as any)
        .select("frases,data,gerado_em")
        .eq("data", data)
        .maybeSingle();
      if (error) {
        console.warn("frases_do_dia query error", error);
        return null;
      }
      return rows as { frases: string[]; data: string; gerado_em: string } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
