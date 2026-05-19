import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const sb = supabase as any;

export type BoletimL1 = {
  id: string;
  data_referencia: string;
  rascunho_md: string | null;
  publicado_md: string | null;
  status: "pendente_revisao" | "publicado" | "arquivado";
  modelo_usado: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  publicado_em: string | null;
  publicado_por: string | null;
  created_at: string;
  updated_at: string;
};

export function useBoletinsL1() {
  return useQuery({
    queryKey: ["boletins-l1"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("boletins")
        .select("*")
        .order("data_referencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BoletimL1[];
    },
  });
}

export function useBoletimPublicadoMaisRecente() {
  return useQuery({
    queryKey: ["boletim-l1-publicado-recente"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("boletins")
        .select("*")
        .eq("status", "publicado")
        .order("data_referencia", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as BoletimL1 | null;
    },
  });
}

export function useBoletimPorData(dataRef: string | undefined) {
  return useQuery({
    queryKey: ["boletim-l1", dataRef],
    enabled: !!dataRef,
    queryFn: async () => {
      const { data, error } = await sb
        .from("boletins")
        .select("*")
        .eq("data_referencia", dataRef)
        .maybeSingle();
      if (error) throw error;
      return data as BoletimL1 | null;
    },
  });
}

export function useUpdateBoletimL1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<BoletimL1>) => {
      const { data, error } = await sb.from("boletins").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boletins-l1"] });
      qc.invalidateQueries({ queryKey: ["boletim-l1-publicado-recente"] });
    },
  });
}

export function usePublicarBoletim() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, conteudo }: { id: string; conteudo: string }) => {
      const { error } = await sb
        .from("boletins")
        .update({
          rascunho_md: conteudo,
          publicado_md: conteudo,
          status: "publicado",
          publicado_em: new Date().toISOString(),
          publicado_por: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boletins-l1"] });
      qc.invalidateQueries({ queryKey: ["boletim-l1-publicado-recente"] });
    },
  });
}

export function useGerarBoletim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts?: { data_referencia?: string; force_regenerate?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("gerar-boletim-diario", {
        body: opts ?? {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boletins-l1"] });
    },
  });
}

// ---- perfis_personalidade ----
export type PerfilPersonalidade = {
  profile_id: string;
  descricao: string | null;
  atualizado_em: string;
};

export function usePerfisPersonalidade() {
  return useQuery({
    queryKey: ["perfis-personalidade"],
    queryFn: async () => {
      const [{ data: perfis, error: e1 }, { data: profiles, error: e2 }] = await Promise.all([
        sb.from("perfis_personalidade").select("*"),
        sb
          .from("profiles")
          .select("id,nome,apelido,role,ativo")
          .eq("ativo", true)
          .order("apelido"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = Object.fromEntries(((perfis ?? []) as any[]).map((p) => [p.profile_id, p]));
      return ((profiles ?? []) as any[])
        .filter((p) => p.role !== "sistema")
        .map((p) => ({
          profile_id: p.id,
          nome: p.nome,
          apelido: p.apelido,
          descricao: map[p.id]?.descricao ?? "",
          atualizado_em: map[p.id]?.atualizado_em ?? null,
        }));
    },
  });
}

export function useSalvarPerfilPersonalidade() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ profile_id, descricao }: { profile_id: string; descricao: string }) => {
      const { error } = await sb
        .from("perfis_personalidade")
        .upsert(
          {
            profile_id,
            descricao,
            atualizado_em: new Date().toISOString(),
            atualizado_por: user?.id ?? null,
          },
          { onConflict: "profile_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfis-personalidade"] }),
  });
}
