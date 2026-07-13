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
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;
      const { data, error } = await supabase
        .from("pesquisa_participacao")
        .select("*")
        .eq("pesquisa_id", pesquisaId!)
        .eq("user_id", userRes.user.id)
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
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("não autenticado");

      // Monta o row só com os campos definidos no payload (MERGE, não OVERWRITE)
      const row: Record<string, any> = {
        pesquisa_id: payload.pesquisa_id,
        user_id: userRes.user.id,
        status: payload.status,
      };
      if (payload.identificou_se !== undefined) row.identificou_se = payload.identificou_se;
      if (payload.lembrar_depois_em !== undefined) row.lembrar_depois_em = payload.lembrar_depois_em;
      if (payload.concluida_em !== undefined) row.concluida_em = payload.concluida_em;

      const { data, error } = await supabase
        .from("pesquisa_participacao")
        .upsert(row, { onConflict: "pesquisa_id,user_id" })
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

// ========== ADMIN ==========

export type PesquisaAdminRow = Pesquisa & {
  criada_em: string;
  participantes_total?: number;
};

export function useAdminPesquisas() {
  return useQuery({
    queryKey: ["admin-pesquisas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pesquisas")
        .select("*, pesquisa_participacao(status)")
        .order("criada_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => {
        const parts = (p.pesquisa_participacao ?? []) as { status: string }[];
        return {
          ...p,
          concluidas: parts.filter((x) => x.status === "concluida").length,
          iniciadas: parts.filter((x) => x.status === "iniciada").length,
          opt_out: parts.filter((x) => x.status === "opt_out").length,
          total_interacoes: parts.length,
        };
      });
    },
  });
}

export type PesquisaResultadoPergunta = {
  id: string;
  ordem: number;
  texto: string;
  tipo: "escala_1_10" | "single" | "multi" | "texto";
  opcoes: string[] | null;
  n_respostas: number;
  agregado: any;
  textos: { texto: string; apelido: string | null; respondido_em: string }[] | null;
  outros: string[] | null;
};

export type PesquisaResultados = {
  pesquisa: {
    id: string;
    slug: string;
    titulo: string;
    ativa: boolean;
    abre_em: string;
    encerra_em: string;
    permite_identificar: boolean;
  };
  funil: {
    universo_perebas: number;
    concluidas: number;
    iniciadas: number;
    opt_out: number;
    identificados: number;
    sem_interacao: number;
  };
  perguntas: PesquisaResultadoPergunta[];
};

export function useAdminResultados(pesquisaId?: string) {
  return useQuery({
    queryKey: ["admin-pesquisa-resultados", pesquisaId],
    enabled: !!pesquisaId,
    queryFn: async (): Promise<PesquisaResultados> => {
      const { data, error } = await (supabase as any).rpc("admin_pesquisa_resultados", {
        p_pesquisa_id: pesquisaId,
      });
      if (error) throw error;
      return data as PesquisaResultados;
    },
  });
}

export async function fetchAdminRespostasFlat(pesquisaId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc("admin_pesquisa_respostas_flat", {
    p_pesquisa_id: pesquisaId,
  });
  if (error) throw error;
  return (data ?? []) as any[];
}

export function useSavePesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      p: Partial<Pesquisa> & { id?: string },
    ): Promise<Pesquisa> => {
      const payload: any = {
        slug: p.slug,
        titulo: p.titulo,
        descricao: p.descricao ?? null,
        ativa: p.ativa ?? false,
        abre_em: p.abre_em,
        encerra_em: p.encerra_em,
        permite_identificar: p.permite_identificar ?? true,
      };
      if (p.id) {
        const { data, error } = await supabase
          .from("pesquisas")
          .update(payload)
          .eq("id", p.id)
          .select()
          .single();
        if (error) throw error;
        return data as Pesquisa;
      }
      const { data, error } = await supabase
        .from("pesquisas")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Pesquisa;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pesquisas"] });
      qc.invalidateQueries({ queryKey: ["admin-pesquisa-resultados"] });
      qc.invalidateQueries({ queryKey: ["pesquisa-slug"] });
    },
  });
}

export function useDeletePesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pesquisas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pesquisas"] }),
  });
}

export function useSavePergunta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      p: Partial<Pergunta> & { pesquisa_id: string; id?: string },
    ) => {
      const payload: any = {
        pesquisa_id: p.pesquisa_id,
        ordem: p.ordem ?? 0,
        texto: p.texto,
        descricao: p.descricao ?? null,
        tipo: p.tipo,
        opcoes: p.tipo === "single" || p.tipo === "multi" ? p.opcoes ?? [] : null,
        permite_outros: p.permite_outros ?? false,
        obrigatoria: p.obrigatoria ?? false,
      };
      if (p.id) {
        const { error } = await supabase
          .from("pesquisa_perguntas")
          .update(payload)
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pesquisa_perguntas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pesquisa-perguntas", v.pesquisa_id] });
    },
  });
}

export function useUpdateOrdemPergunta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ordem, pesquisa_id: _pid }: { id: string; ordem: number; pesquisa_id: string }) => {
      const { error } = await supabase
        .from("pesquisa_perguntas")
        .update({ ordem })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pesquisa-perguntas", v.pesquisa_id] });
    },
  });
}

export function useDeletePergunta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pesquisa_id: _pid }: { id: string; pesquisa_id: string }) => {
      const { error } = await supabase.from("pesquisa_perguntas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pesquisa-perguntas", v.pesquisa_id] });
    },
  });
}

