import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoriaPremiado =
  | "primeiro"
  | "segundo"
  | "terceiro"
  | "quarto"
  | "quinto"
  | "lanterninha";

export type PremiadoRow = {
  categoria: CategoriaPremiado;
  posicao: number | null;
  quota_id: string | null;
  apelido: string;
  numero_quota: number;
  user_id: string | null;
  valor_total: number;
  valor_bruto: number;
  valor_bonus_primeiro: number;
  data_notificacao: string | null;
  dados_bancarios_recebidos: boolean;
  pago_em: string | null;
  comprovante_path: string | null;
};


export const CATEGORIAS_ORDER: CategoriaPremiado[] = [
  "primeiro",
  "segundo",
  "terceiro",
  "quarto",
  "quinto",
  "lanterninha",
];

export const CATEGORIA_META: Record<CategoriaPremiado, { emoji: string; label: string }> = {
  primeiro: { emoji: "🏆", label: "1º lugar" },
  segundo: { emoji: "🥈", label: "2º lugar" },
  terceiro: { emoji: "🥉", label: "3º lugar" },
  quarto: { emoji: "🎖️", label: "4º lugar" },
  quinto: { emoji: "🎖️", label: "5º lugar" },
  lanterninha: { emoji: "🐔", label: "Lanterninha" },
};

export function usePremiados() {
  return useQuery({
    queryKey: ["premiados"],
    queryFn: async (): Promise<PremiadoRow[]> => {
      const { data, error } = await (supabase as any)
        .from("premiados")
        .select(
          "categoria,posicao,quota_id,apelido,numero_quota,user_id,valor_total,valor_bruto,valor_bonus_primeiro,data_notificacao,dados_bancarios_recebidos",
        );
      if (error) throw error;
      const rows = (data ?? []) as PremiadoRow[];
      const idx = (c: CategoriaPremiado) => CATEGORIAS_ORDER.indexOf(c);
      return rows.sort((a, b) => idx(a.categoria) - idx(b.categoria));
    },
    refetchInterval: 30_000,
  });
}
