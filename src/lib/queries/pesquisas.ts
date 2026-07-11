import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Pesquisa = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  abre_em: string;
  encerra_em: string;
  permite_identificar: boolean;
};

export type Pergunta = {
  id: string;
  pesquisa_id: string;
  ordem: number;
  texto: string;
  descricao: string | null;
  tipo: "escala_1_10" | "single" | "multi" | "texto";
  opcoes: string[] | null;
  permite_outros: boolean;
  obrigatoria: boolean;
};

export type Participacao = {
  id: string;
  pesquisa_id: string;
  user_id: string;
  status: "iniciada" | "concluida" | "opt_out";
  identificou_se: boolean;
  lembrar_depois_em: string | null;
  iniciada_em: string;
  concluida_em: string | null;
};

export function usePesquisaAtiva() {
  return useQuery({
    queryKey: ["pesquisa-ativa"],
    queryFn: async (): Promise<Pesquisa | null> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("pesquisas")
        .select("*")
        .eq("ativa", true)
        .lte("abre_em", nowIso)
        .gte("encerra_em", nowIso)
        .order("criada_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Pesquisa | null;
    },
    staleTime: 60_000,
  });
}

export function usePesquisaPorSlug(slug?: string) {
  return useQuery({
    queryKey: ["pesquisa-slug", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Pesquisa | null> => {
      const { data, error } = await supabase
        .from("pesquisas")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as Pesquisa | null;
    },
  });
}

export function usePerguntas(pesquisaId?: string) {
  return useQuery({
    queryKey: ["pesquisa-perguntas", pesquisaId],
    enabled: !!pesquisaId,
    queryFn: async (): Promise<Pergunta[]> => {
      const { data, error } = await supabase
        .from("pesquisa_perguntas")
        .select("*")
        .eq("pesquisa_id", pesquisaId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pergunta[];
    },
  });
}

export function useMinhaParticipacao(pesquisaId?: string) {
  return useQuery({
    queryKey: ["pesquisa-participacao", pesquisaId],
    enabled: !!pesquisaId,
    queryFn: async (): Promise<Participacao | null> => {
      const { data, error } = await supabase
        .from("pesquisa_participacao")
        .select("*")
        .eq("pesquisa_id", pesquisaId!)
        .maybeSingle();
      if (error && (error as any).code !== "PGRST116") throw error;
      return (data ?? null) as Participacao | null;
    },
  });
}

export function useUpsertParticipacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pesquisa_id: string;
      status: "iniciada" | "concluida" | "opt_out";
      identificou_se?: boolean;
      lembrar_depois_em?: string | null;
      concluida_em?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("não autenticado");
      const { data, error } = await supabase
        .from("pesquisa_participacao")
        .upsert(
          {
            pesquisa_id: payload.pesquisa_id,
            user_id: user.user.id,
            status: payload.status,
            identificou_se: payload.identificou_se ?? false,
            lembrar_depois_em: payload.lembrar_depois_em ?? null,
            concluida_em: payload.concluida_em ?? null,
          },
          { onConflict: "pesquisa_id,user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as Participacao;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pesquisa-participacao"] });
    },
  });
}

export function useInserirRespostas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pesquisa_id: string;
      participacao_id: string;
      respostas: {
        pergunta_id: string;
        resposta: any;
        resposta_texto_outros?: string | null;
      }[];
    }) => {
      const rows = payload.respostas.map((r) => ({
        pesquisa_id: payload.pesquisa_id,
        pergunta_id: r.pergunta_id,
        participacao_id: payload.participacao_id,
        resposta: r.resposta,
        resposta_texto_outros: r.resposta_texto_outros ?? null,
      }));
      const { error } = await supabase.from("pesquisa_respostas").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pesquisa-participacao"] });
    },
  });
}
