import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// S3.3b parte 2 — fila de aprovação de lotes por competição (sem hardcode de slug/ID).

export const STATUS_AGUARDANDO = "aguardando_aprovacao";
export const STATUS_SECUNDARIOS = ["incompleta", "rejeitado"] as const;

export type LoteAdmin = {
  id: string;
  status: string;
  quantidade_pedida: number;
  valor_esperado: number;
  comprovante_url: string | null;
  motivo_rejeicao: string | null;
  tentativas_comprovante: number;
  criado_em: string;
  nome: string;
  apelido: string;
};

export type LotesAdminData = {
  competicao: { id: string; nome: string; nomeCurto: string; status: string };
  aguardando: LoteAdmin[];
  secundarios: LoteAdmin[];
};

type LoteRow = {
  id: string;
  status: string;
  quantidade_pedida: number;
  valor_esperado: number;
  comprovante_url: string | null;
  motivo_rejeicao: string | null;
  tentativas_comprovante: number | null;
  criado_em: string;
  user_id: string;
};

export function useAdminLotes(slug: string) {
  return useQuery({
    queryKey: ["admin-lotes", slug],
    queryFn: async (): Promise<LotesAdminData> => {
      const { data: competicao, error: compError } = await supabase
        .from("competicoes")
        .select("id, nome, nome_curto, status")
        .eq("slug", slug)
        .single();
      if (compError) throw compError;

      const { data: lotes, error: lotesError } = await supabase
        .from("lotes_compra")
        .select(
          "id, status, quantidade_pedida, valor_esperado, comprovante_url, motivo_rejeicao, tentativas_comprovante, criado_em, user_id",
        )
        .eq("competicao_id", competicao.id)
        .in("status", [STATUS_AGUARDANDO, ...STATUS_SECUNDARIOS])
        .order("criado_em", { ascending: true })
        .limit(500);
      if (lotesError) throw lotesError;

      const rows = (lotes ?? []) as LoteRow[];
      const userIds = Array.from(new Set(rows.map((l) => l.user_id)));
      const perfis = userIds.length
        ? (await supabase.from("profiles").select("id, nome, apelido").in("id", userIds)).data ?? []
        : [];
      const mapaPerfis = new Map(perfis.map((p) => [p.id, p]));

      const mapear = (l: LoteRow): LoteAdmin => ({
        id: l.id,
        status: l.status,
        quantidade_pedida: l.quantidade_pedida,
        valor_esperado: Number(l.valor_esperado),
        comprovante_url: l.comprovante_url,
        motivo_rejeicao: l.motivo_rejeicao,
        tentativas_comprovante: l.tentativas_comprovante ?? 0,
        criado_em: l.criado_em,
        nome: mapaPerfis.get(l.user_id)?.nome ?? "—",
        apelido: mapaPerfis.get(l.user_id)?.apelido ?? "—",
      });

      return {
        competicao: {
          id: competicao.id,
          nome: competicao.nome,
          nomeCurto: competicao.nome_curto,
          status: competicao.status,
        },
        aguardando: rows.filter((l) => l.status === STATUS_AGUARDANDO).map(mapear),
        secundarios: rows.filter((l) => l.status !== STATUS_AGUARDANDO).map(mapear),
      };
    },
  });
}

async function enviarEmail(fn: string, body: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke(fn, { body });
    return !error;
  } catch {
    return false;
  }
}

export function useAprovarLote(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, aprovarN }: { loteId: string; aprovarN?: number }) => {
      const { data, error } = await supabase.rpc("aprovar_lote", {
        p_lote_id: loteId,
        ...(aprovarN != null ? { p_aprovar_n: aprovarN } : {}),
      });
      if (error) throw error;
      const emailOk = await enviarEmail("send-pagamento-aprovado-email", { lote_id: loteId });
      const resumo = data as { aprovadas?: number; rejeitadas?: number } | null;
      return { emailOk, aprovadas: resumo?.aprovadas ?? 0, rejeitadas: resumo?.rejeitadas ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lotes", slug] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useRejeitarLote(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, motivo }: { loteId: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("rejeitar_lote", { p_lote_id: loteId, p_motivo: motivo });
      if (error) throw error;
      const emailOk = await enviarEmail("send-pagamento-rejeitado-email", { lote_id: loteId, motivo });
      return { emailOk, encerrado: !!(data as { encerrado?: boolean } | null)?.encerrado };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lotes", slug] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// Contagem de lotes aguardando aprovação, agrupada por competição (para badges).
export function useLotesAguardandoPorCompeticao() {
  return useQuery({
    queryKey: ["admin-lotes", "contagem"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("lotes_compra")
        .select("competicao_id")
        .eq("status", STATUS_AGUARDANDO)
        .limit(1000);
      if (error) throw error;
      const contagem: Record<string, number> = {};
      for (const row of data ?? []) {
        contagem[row.competicao_id] = (contagem[row.competicao_id] ?? 0) + 1;
      }
      return contagem;
    },
  });
}
