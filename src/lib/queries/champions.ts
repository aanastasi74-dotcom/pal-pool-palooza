import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type ChampionsTotal = {
  quotas_total: number;
  perebas: number;
  quorum: number;
  prazo: string;
};

export function useChampionsTotal() {
  return useQuery({
    queryKey: ["champions", "total"],
    queryFn: async (): Promise<ChampionsTotal> => {
      const { data, error } = await supabase.rpc("champions_interesse_total");
      if (error) throw error;
      return data as unknown as ChampionsTotal;
    },
  });
}

export function useMinhaManifestacao() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["champions", "minha", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champions_interesse")
        .select("quotas, atualizado_em")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertManifestacao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (quotas: number) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("champions_interesse")
        .upsert({ user_id: user.id, quotas }, { onConflict: "user_id" });
      if (error) {
        if (error.message?.includes("prazo_encerrado")) {
          throw new Error("O prazo da manifestação encerrou em 07/08.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["champions"] });
    },
  });
}

// Público (sem login)
export function useChampionsTotalPublico() {
  return useQuery({
    queryKey: ["champions", "total-publico"],
    queryFn: async (): Promise<ChampionsTotal> => {
      const { data, error } = await supabase.rpc("champions_interesse_total_publico");
      if (error) throw error;
      return data as unknown as ChampionsTotal;
    },
  });
}

export type ManifestacaoExternaInput = {
  nome: string;
  email: string;
  quotas: number;
  indicado_por?: string | null;
};

export function useRegistrarInteresseExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManifestacaoExternaInput) => {
      const payload = {
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        quotas: input.quotas,
        indicado_por: input.indicado_por?.trim() || null,
      };
      const { error } = await supabase.from("champions_interesse_externo").insert(payload);
      if (error) {
        if (error.code === "23505" || /duplicate/i.test(error.message)) {
          throw new Error(
            "Esse email já manifestou interesse — qualquer ajuste, fala com quem te indicou rsrs",
          );
        }
        if (/prazo_encerrado/i.test(error.message)) {
          throw new Error("O prazo encerrou em 07/08.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["champions", "total-publico"] });
    },
  });
}

// Admin — externos
export function useChampionsExternos() {
  return useQuery({
    queryKey: ["champions", "admin", "externos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champions_interesse_externo")
        .select("id, nome, email, quotas, indicado_por, criado_em, atualizado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Admin
export function useChampionsRespostas() {
  return useQuery({
    queryKey: ["champions", "admin", "respostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champions_interesse")
        .select("user_id, quotas, atualizado_em, profiles!inner(apelido, nome)")
        .order("atualizado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string;
        quotas: number;
        atualizado_em: string;
        profiles: { apelido: string; nome: string } | null;
      }>;
    },
  });
}

export type ChampionsEnvioStatus = { enviado_em: string | null; destinatarios: number };

export function useChampionsEnvioStatus() {
  return useQuery({
    queryKey: ["champions", "admin", "envio"],
    queryFn: async (): Promise<ChampionsEnvioStatus> => {
      const { data, error } = await supabase.functions.invoke("enviar-manifestacao-champions", {
        method: "GET",
      });
      if (error) throw error;
      return data as ChampionsEnvioStatus;
    },
  });
}

export function useDispararManifestacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { action: "teste" | "enviar"; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("enviar-manifestacao-champions", {
        body: args,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["champions", "admin", "envio"] });
    },
  });
}

// Cadastros pendentes (admin)
export type CadastroPendente = {
  id: string;
  nome: string;
  apelido: string | null;
  email: string | null;
  indicado_por: string | null;
  criado_em: string | null;
  quotas: number;
};

export function useCadastrosPendentes() {
  return useQuery({
    queryKey: ["champions", "admin", "pendentes"],
    queryFn: async (): Promise<CadastroPendente[]> => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, nome, apelido, email, indicado_por, created_at")
        .eq("aprovacao_status", "pendente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (profs ?? []).map((p) => p.id);
      let quotasMap = new Map<string, number>();
      if (ids.length) {
        const { data: manifs } = await supabase
          .from("champions_interesse")
          .select("user_id, quotas")
          .in("user_id", ids);
        for (const m of manifs ?? []) quotasMap.set(m.user_id, m.quotas ?? 0);
      }
      return (profs ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        apelido: (p as any).apelido ?? null,
        email: (p as any).email ?? null,
        indicado_por: (p as any).indicado_por ?? null,
        criado_em: (p as any).created_at ?? null,
        quotas: quotasMap.get(p.id) ?? 0,
      }));
    },
  });
}

export function useModerarCadastro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { user_id: string; acao: "aprovar" | "rejeitar" }) => {
      const { data, error } = await supabase.functions.invoke("moderar-cadastro", {
        body: args,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["champions", "admin", "pendentes"] });
      qc.invalidateQueries({ queryKey: ["champions"] });
    },
  });
}

// Minha manifestação de quotas (usado na tela de aguardando aprovação)
export function useMinhaManifestacaoQuotasPendente(userId: string | undefined) {
  return useQuery({
    queryKey: ["champions", "minha-quotas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("champions_interesse")
        .select("quotas")
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.quotas ?? 0;
    },
  });
}

