import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const criarCompeticaoSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), id: z.string(), slug: z.string(), settings_criadas: z.number() }),
  z.object({ ok: z.literal(false), erro: z.string() }).passthrough(),
]);

export class WizardCompeticaoError extends Error {
  constructor(public codigo: string) {
    super(codigo);
    this.name = "WizardCompeticaoError";
  }
}

export function useFormatosWizard() {
  return useQuery({
    queryKey: ["wizard-formatos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formatos")
        .select("codigo, nome, disponivel")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScoreRulesWizard() {
  return useQuery({
    queryKey: ["wizard-score-rules", "copa2026"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("setting_da_competicao", {
        p_slug: "copa2026",
        p_key: "score_rules",
      });
      if (error) throw error;
      return z.record(z.unknown()).parse(data);
    },
  });
}

export async function slugCompeticaoJaExiste(slug: string) {
  const { count, error } = await supabase
    .from("competicoes")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export function useCriarCompeticaoWizard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { competicao: Record<string, unknown>; settings: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("criar_competicao", {
        p_payload: payload as Json,
      });
      if (error) throw error;
      const resultado = criarCompeticaoSchema.parse(data);
      if (!resultado.ok) throw new WizardCompeticaoError(resultado.erro);
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competicoes", "admin-lobby"] });
    },
  });
}
