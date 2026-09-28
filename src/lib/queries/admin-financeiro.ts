import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const apuracaoSchema = z.object({
  ok: z.boolean(),
  erro: z.string().optional(),
  incentivo: z
    .object({
      tipo: z.string(),
      valor_por_adesao: z.coerce.number().default(0),
      teto: z.coerce.number().default(0),
      gatilho: z.string().optional(),
    })
    .nullish(),
  promotores: z
    .array(
      z.object({
        promotor_id: z.string(),
        apelido: z.string().nullish(),
        nome: z.string().nullish(),
        adesoes: z.coerce.number(),
        valor_devido: z.coerce.number(),
        ja_lancado: z.coerce.number(),
        saldo_a_lancar: z.coerce.number(),
      }),
    )
    .nullish(),
});

export type ApuracaoIncentivos = z.infer<typeof apuracaoSchema>;
export type PromotorApurado = NonNullable<ApuracaoIncentivos["promotores"]>[number];

export const ERROS_LANCAMENTO: Record<string, string> = {
  excede_saldo: "O valor excede o saldo a lançar",
  valor_invalido: "Valor inválido",
  sem_incentivo_configurado: "Nenhum incentivo configurado para esta competição",
  competicao_invalida: "Competição inválida",
  promotor_invalido: "Promotor inválido",
  nao_autorizado: "Você não tem permissão para lançar incentivos",
  competicao_arquivada: "Competição arquivada — somente leitura",
};

export function useApuracaoIncentivos(slug: string) {
  return useQuery({
    queryKey: ["admin-incentivos", slug],
    queryFn: async () => {
      const [{ data, error }, comp] = await Promise.all([
        supabase.rpc("apurar_incentivos", { p_slug: slug }),
        supabase.from("competicoes").select("status").eq("slug", slug).maybeSingle(),
      ]);
      if (error) throw error;
      const apuracao = apuracaoSchema.parse(data);
      if (!apuracao.ok) throw new Error(apuracao.erro ?? "Falha na apuração");
      return { ...apuracao, status: comp.data?.status ?? null };
    },
  });
}

export function useLancarIncentivo(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { promotorId: string; valor: number; descricao?: string }) => {
      const { data, error } = await supabase.rpc("lancar_incentivo_promotor", {
        p_slug: slug,
        p_promotor_id: z.string().uuid().parse(v.promotorId),
        p_valor: v.valor,
        p_descricao: v.descricao?.trim() || undefined,
      });
      if (error) throw error;
      const r = (data ?? {}) as { ok?: boolean; erro?: string; saldo_a_lancar?: number; valor?: number; tipo_movimento?: string };
      if (!r.ok) {
        let msg = ERROS_LANCAMENTO[r.erro ?? ""] ?? r.erro ?? "Não foi possível lançar o incentivo";
        if (r.erro === "excede_saldo" && r.saldo_a_lancar != null) msg += ` (saldo: ${brl(Number(r.saldo_a_lancar))})`;
        throw new Error(msg);
      }
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-incentivos", slug] });
      qc.invalidateQueries({ queryKey: ["admin-financeiro"] });
    },
  });
}

export type MovimentoFin = {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  criado_em: string;
  competicao_id: string;
};

export function useFinanceiroPlataforma() {
  return useQuery({
    queryKey: ["admin-financeiro"],
    queryFn: async () => {
      const [movs, comps] = await Promise.all([
        supabase
          .from("caixa_movimentos")
          .select("id, tipo, categoria, descricao, valor, criado_em, competicao_id")
          .order("criado_em", { ascending: false })
          .range(0, 9999),
        supabase.from("competicoes").select("id, slug, nome_curto, status").order("created_at"),
      ]);
      if (movs.error) throw movs.error;
      if (comps.error) throw comps.error;
      return { movimentos: (movs.data ?? []) as MovimentoFin[], competicoes: comps.data ?? [] };
    },
  });
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const isSaida = (tipo: string) => tipo === "saida";
