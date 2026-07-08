import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BoletimEncerramento = {
  id: string;
  data_referencia: string;
  status: string;
  titulo_customizado: string | null;
  publicado_em: string | null;
};

export function useBoletimEncerramento() {
  return useQuery({
    queryKey: ["boletim-encerramento"],
    queryFn: async (): Promise<BoletimEncerramento | null> => {
      const { data, error } = await (supabase as any)
        .from("boletins")
        .select("id,data_referencia,status,titulo_customizado,publicado_em")
        .eq("tipo", "encerramento")
        .order("data_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as BoletimEncerramento) ?? null;
    },
    staleTime: 30_000,
  });
}
