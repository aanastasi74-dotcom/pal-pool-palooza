import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// S3.3b — máquina de inscrição/compra genérica por competição (slug).
// Mesma mecânica da Copa (lote + N quotas + comprovante), sem hardcode de preço ou ID.

export type CompeticaoInscricao = {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string;
  status: string;
  preco_quota: number | null;
  limite_quotas_pereba: number | null;
  inscricoes_ate: string | null;
};

export const STATUS_LOTE_ABERTO = ["incompleta", "aguardando_aprovacao", "rejeitado"] as const;
const STATUS_QUOTA_CONTA = ["incompleta", "aguardando_aprovacao", "ativa"] as const;

export function useCompeticaoPorSlug(slug: string) {
  return useQuery({
    queryKey: ["competicao", slug],
    queryFn: async (): Promise<CompeticaoInscricao | null> => {
      const { data, error } = await supabase
        .from("competicoes")
        .select("id, slug, nome, nome_curto, status, preco_quota, limite_quotas_pereba, inscricoes_ate")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as CompeticaoInscricao | null) ?? null;
    },
  });
}

export type InscricaoContexto = {
  competicao: CompeticaoInscricao;
  limite: number;
  jaTem: number;
  disponivel: number;
  loteAberto: { id: string; status: string; quantidade_pedida: number; valor_esperado: number; motivo_rejeicao: string | null } | null;
};

export function useInscricaoContexto(slug: string) {
  const { user } = useAuth();
  const { data: competicao } = useCompeticaoPorSlug(slug);
  return useQuery({
    queryKey: ["inscricao", slug, user?.id, competicao?.id],
    enabled: !!user?.id && !!competicao?.id,
    queryFn: async (): Promise<InscricaoContexto> => {
      const comp = competicao!;
      const [limiteRes, quotasRes, lotesRes] = await Promise.all([
        supabase.rpc("limite_quotas_pereba", { p_user_id: user!.id, p_competicao_id: comp.id }),
        supabase
          .from("quotas")
          .select("id, status")
          .eq("user_id", user!.id)
          .eq("competicao_id", comp.id)
          .in("status", STATUS_QUOTA_CONTA as unknown as string[]),
        supabase
          .from("lotes_compra")
          .select("id, status, quantidade_pedida, valor_esperado, motivo_rejeicao")
          .eq("user_id", user!.id)
          .eq("competicao_id", comp.id)
          .in("status", STATUS_LOTE_ABERTO as unknown as string[])
          .order("criado_em", { ascending: false })
          .limit(1),
      ]);
      if (limiteRes.error) throw limiteRes.error;
      if (quotasRes.error) throw quotasRes.error;
      if (lotesRes.error) throw lotesRes.error;

      const limite = Number(limiteRes.data ?? comp.limite_quotas_pereba ?? 0);
      const jaTem = quotasRes.data?.length ?? 0;
      return {
        competicao: comp,
        limite,
        jaTem,
        disponivel: Math.max(0, limite - jaTem),
        loteAberto: lotesRes.data?.[0] ?? null,
      };
    },
  });
}

export function useCriarLoteInscricao(slug: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ competicao, quantidade }: { competicao: CompeticaoInscricao; quantidade: number }) => {
      if (!user) throw new Error("Não autenticado.");
      const preco = Number(competicao.preco_quota ?? 0);
      if (!(preco > 0)) throw new Error("Preço da quota não configurado para esta competição.");

      const { data: lote, error: errLote } = await supabase
        .from("lotes_compra")
        .insert({
          user_id: user.id,
          competicao_id: competicao.id,
          quantidade_pedida: quantidade,
          valor_esperado: quantidade * preco,
          status: "incompleta",
        })
        .select("id")
        .single();
      if (errLote) throw errLote;

      const rows = Array.from({ length: quantidade }, () => ({
        user_id: user.id,
        competicao_id: competicao.id,
        lote_id: lote.id,
        status: "incompleta" as const,
      }));
      const { error: errQuotas } = await supabase.from("quotas").insert(rows);
      if (errQuotas) throw errQuotas;
      return lote.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inscricao", slug] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
    },
  });
}
