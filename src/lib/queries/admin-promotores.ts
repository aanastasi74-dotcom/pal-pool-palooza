import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const nomearSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), codigo: z.string().min(1) }),
  z.object({ ok: z.literal(false), erro: z.string() }),
]);

export const incentivoSchema = z.object({
  tipo: z.enum(["desconto_quota", "quota_extra", "comissao", "nenhum"]),
  valor_por_adesao: z.number().nonnegative().finite(),
  teto: z.number().nonnegative().finite(),
  gatilho: z.literal("quota_paga"),
});

export type PromotorIncentivo = z.infer<typeof incentivoSchema>;

export type PromotorAdmin = {
  userId: string;
  nome: string;
  apelido: string;
  codigo: string;
  convidado: number;
  cadastrado: number;
  aderiu: number;
};

export type PromotoresAdminData = {
  competicao: { id: string; nome: string; nomeCurto: string; status: string };
  promotores: PromotorAdmin[];
  usuariosAtivos: { id: string; nome: string; apelido: string }[];
  limiteConvites: number;
  incentivo: PromotorIncentivo;
};

const incentivoPadrao: PromotorIncentivo = {
  tipo: "nenhum",
  valor_por_adesao: 0,
  teto: 0,
  gatilho: "quota_paga",
};

export function useAdminPromotores(slug: string) {
  return useQuery({
    queryKey: ["admin-promotores", slug],
    queryFn: async (): Promise<PromotoresAdminData> => {
      const { data: competicao, error: competicaoError } = await supabase
        .from("competicoes")
        .select("id, nome, nome_curto, status")
        .eq("slug", slug)
        .single();
      if (competicaoError) throw competicaoError;

      const [papeisResult, indicacoesResult, perfisResult, settingsResult] = await Promise.all([
        supabase
          .from("competicao_papeis")
          .select("user_id, config, profiles!competicao_papeis_user_id_fkey(nome, apelido)")
          .eq("competicao_id", competicao.id)
          .eq("papel", "promotor"),
        supabase
          .from("indicacoes")
          .select("promotor_id, status")
          .eq("competicao_id", competicao.id),
        supabase
          .from("profiles")
          .select("id, nome, apelido")
          .eq("ativo", true)
          .order("apelido"),
        supabase
          .from("competicao_settings")
          .select("key, value")
          .eq("competicao_id", competicao.id)
          .in("key", ["promotor_limite_convites", "promotor_incentivo"]),
      ]);

      for (const result of [papeisResult, indicacoesResult, perfisResult, settingsResult]) {
        if (result.error) throw result.error;
      }

      const contagens = new Map<string, Record<string, number>>();
      for (const indicacao of indicacoesResult.data ?? []) {
        const atual = contagens.get(indicacao.promotor_id) ?? {};
        atual[indicacao.status] = (atual[indicacao.status] ?? 0) + 1;
        contagens.set(indicacao.promotor_id, atual);
      }

      const promotores = (papeisResult.data ?? [])
        .map((papel): PromotorAdmin => {
          const config = papel.config && typeof papel.config === "object" && !Array.isArray(papel.config)
            ? papel.config
            : {};
          const profile = papel.profiles;
          const porStatus = contagens.get(papel.user_id) ?? {};
          return {
            userId: papel.user_id,
            nome: profile?.nome ?? "Usuário",
            apelido: profile?.apelido ?? "Sem apelido",
            codigo: typeof config.codigo === "string" ? config.codigo : "—",
            convidado: porStatus.convidado ?? 0,
            cadastrado: porStatus.cadastrado ?? 0,
            aderiu: porStatus.aderiu ?? 0,
          };
        })
        .sort((a, b) => b.aderiu - a.aderiu || a.apelido.localeCompare(b.apelido));

      const settings = new Map((settingsResult.data ?? []).map((item) => [item.key, item.value]));
      const limiteRaw = settings.get("promotor_limite_convites");
      const limiteConvites = typeof limiteRaw === "number" && Number.isFinite(limiteRaw) ? limiteRaw : 30;
      const incentivoParseado = incentivoSchema.safeParse(settings.get("promotor_incentivo"));

      return {
        competicao: {
          id: competicao.id,
          nome: competicao.nome,
          nomeCurto: competicao.nome_curto,
          status: competicao.status,
        },
        promotores,
        usuariosAtivos: perfisResult.data ?? [],
        limiteConvites,
        incentivo: incentivoParseado.success ? incentivoParseado.data : incentivoPadrao,
      };
    },
  });
}

export function useNomearPromotor(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const userIdValidado = z.string().uuid().parse(userId);
      const { data, error } = await supabase.rpc("nomear_promotor", {
        p_slug: slug,
        p_user_id: userIdValidado,
      });
      if (error) throw error;
      const resultado = nomearSchema.parse(data);
      if (!resultado.ok) throw new Error(resultado.erro);
      return resultado;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-promotores", slug] }),
  });
}

export function useRemoverPromotor(slug: string, competicaoId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!competicaoId) throw new Error("Competição não encontrada");
      const userIdValidado = z.string().uuid().parse(userId);
      const { error } = await supabase
        .from("competicao_papeis")
        .delete()
        .eq("competicao_id", competicaoId)
        .eq("user_id", userIdValidado)
        .eq("papel", "promotor");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-promotores", slug] }),
  });
}

export function useSalvarPromotorSettings(slug: string, competicaoId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ limiteConvites, incentivo }: { limiteConvites: number; incentivo: PromotorIncentivo }) => {
      if (!competicaoId) throw new Error("Competição não encontrada");
      const limite = z.number().int().min(1).max(1000).parse(limiteConvites);
      const incentivoValidado = incentivoSchema.parse(incentivo);
      const { error } = await supabase.from("competicao_settings").upsert(
        [
          { competicao_id: competicaoId, key: "promotor_limite_convites", value: limite },
          { competicao_id: competicaoId, key: "promotor_incentivo", value: incentivoValidado },
        ],
        { onConflict: "competicao_id,key" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-promotores", slug] }),
  });
}