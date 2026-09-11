import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const painelSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(false), erro: z.string() }),
  z.object({
    ok: z.literal(true),
    codigo: z.string().min(1),
    convidados: z.number().int().nonnegative(),
    cadastrados: z.number().int().nonnegative(),
    aderiram: z.number().int().nonnegative(),
    incentivo: z.object({
      tipo: z.string(),
      valor_acumulado: z.coerce.number().nonnegative(),
    }),
  }),
]);

const conviteSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: z.string().uuid(),
    email_enviado: z.boolean().optional(),
    aviso: z.string().optional(),
  }),
  z.object({ ok: z.literal(false), erro: z.string() }),
]);

const emailSchema = z.string().trim().email().max(255);

export type PromotorPainel = Extract<z.infer<typeof painelSchema>, { ok: true }>;

export function usePromotorPainel(slug: string, enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["promotor-painel", slug, user?.id],
    enabled: enabled && !!user,
    retry: false,
    queryFn: async (): Promise<PromotorPainel | null> => {
      const { data, error } = await supabase.rpc("promotor_painel", { p_slug: slug });
      if (error) throw error;

      const resultado = painelSchema.parse(data);
      if (!resultado.ok && resultado.erro === "nao_e_promotor") return null;
      if (!resultado.ok) throw new Error(resultado.erro);
      return resultado;
    },
  });
}

export function useCriarIndicacao(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const emailValidado = emailSchema.parse(email).toLowerCase();
      const { data, error } = await supabase.functions.invoke("enviar-convite-promotor", {
        body: { slug, email: emailValidado },
      });
      if (error) throw error;

      const resultado = conviteSchema.parse(data);
      if (!resultado.ok) throw new Error(resultado.erro);
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotor-painel", slug] });
    },
  });
}