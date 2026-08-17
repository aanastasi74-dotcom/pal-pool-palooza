import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompeticaoStatus =
  | "rascunho"
  | "pesquisa"
  | "inscricoes"
  | "ativa"
  | "encerrada"
  | "arquivada"
  | "cancelada";

export type Competicao = {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string;
  formato: string;
  status: string;
  inicio: string | null;
  fim: string | null;
  quorum_quotas: number | null;
  preco_quota: number | null;
};

export function useCompeticoes() {
  return useQuery({
    queryKey: ["competicoes"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Competicao[]> => {
      const { data, error } = await supabase
        .from("competicoes")
        .select("id, slug, nome, nome_curto, formato, status, inicio, fim, quorum_quotas, preco_quota")
        .order("inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competicao[];
    },
  });
}

export function useCompeticaoAtiva() {
  const { data, ...rest } = useCompeticoes();
  return { ...rest, data: data?.find((c) => c.status === "ativa") };
}

export type ManifestacaoTotal = {
  quotas_total: number;
  perebas: number;
  quorum: number;
  prazo: string | null;
  status?: string;
};

export function useManifestacaoTotal(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["manifestacao-total", slug],
    enabled,
    queryFn: async (): Promise<ManifestacaoTotal> => {
      const { data, error } = await supabase.rpc("manifestacao_total", { p_slug: slug });
      if (error) throw error;
      return data as unknown as ManifestacaoTotal;
    },
  });
}

// S2/S4: rotas por slug quando houver 2ª competição navegável
const ROTAS: Record<string, string> = {
  copa2026: "/app/copa2026",
  feminina2027: "/app/feminina",
  champions2627: "/app/champions",
};

export function competicaoRota(slug: string): string {
  return ROTAS[slug] ?? "/app";
}

export function nomeCurtoTitulo(c: Pick<Competicao, "nome" | "nome_curto">) {
  return c.nome.replace(/^Bolão dos Perebas\s*[—-]\s*/i, "") || c.nome_curto;
}
