import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/queries/admin-financeiro";
import { executarRegistroDevolucao, validarComprovanteDevolucao } from "@/lib/queries/admin-financial-rules";

export const STATUS_CANCELAVEIS = ["pesquisa", "inscricoes", "ativa"];

export type Devolucao = {
  user_id: string;
  apelido: string | null;
  nome: string | null;
  email: string | null;
  pago: number;
  devolvido: number;
  saldo_a_devolver: number;
};

const ERROS: Record<string, string> = {
  motivo_obrigatorio_min_10: "O motivo precisa ter pelo menos 10 caracteres",
  status_nao_cancelavel: "Essa competição não pode ser cancelada no status atual",
  competicao_invalida: "Competição inválida",
  nao_autorizado: "Você não tem permissão para essa ação",
  excede_saldo: "O valor excede o saldo a devolver",
  valor_invalido: "Valor inválido",
  nao_cancelada: "A competição não está cancelada",
  ja_enviado: "O e-mail de cancelamento já foi enviado",
};
const msg = (e?: string, fb = "Algo deu errado") => ERROS[e ?? ""] ?? e ?? fb;

export function useCompeticaoStatus(slug: string) {
  return useQuery({
    queryKey: ["admin-competicao-status", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competicoes")
        .select("id, slug, nome, nome_curto, status")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDevolucoes(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-devolucoes", slug],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("devolucoes_pendentes", { p_slug: slug });
      if (error) throw error;
      const r = (data ?? {}) as { ok?: boolean; erro?: string; devolucoes?: any[] };
      if (!r.ok) throw new Error(msg(r.erro, "Falha ao carregar devoluções"));
      return (r.devolucoes ?? []).map((d) => ({
        ...d,
        pago: Number(d.pago ?? 0),
        devolvido: Number(d.devolvido ?? 0),
        saldo_a_devolver: Number(d.saldo_a_devolver ?? 0),
      })) as Devolucao[];
    },
  });
}

export function useCancelarCompeticao(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (motivo: string) => {
      const { data, error } = await supabase.rpc("cancelar_competicao", { p_slug: slug, p_motivo: motivo });
      if (error) throw error;
      const r = (data ?? {}) as { ok?: boolean; erro?: string; perebas_afetados?: number; total_a_devolver?: number };
      if (!r.ok) throw new Error(msg(r.erro, "Não foi possível cancelar"));
      return { perebas: Number(r.perebas_afetados ?? 0), total: Number(r.total_a_devolver ?? 0) };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRegistrarDevolucao(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { userId: string; valor: number; comprovante: File; descricao?: string }) => {
      const extensao = validarComprovanteDevolucao(v.comprovante);
      if (!Number.isFinite(v.valor) || v.valor <= 0) throw new Error("Informe um valor maior que zero");
      const registro = await executarRegistroDevolucao({
        upload: async () => {
          const path = `devolucoes/${slug}/${v.userId}-${Date.now()}.${extensao}`;
          const { error } = await supabase.storage.from("comprovantes-pix").upload(path, v.comprovante, {
            cacheControl: "3600", upsert: false, contentType: v.comprovante.type,
          });
          if (error) throw new Error(`Não foi possível enviar o comprovante: ${error.message}`);
          return path;
        },
        registrar: async () => {
          const { data, error } = await supabase.rpc("registrar_devolucao", {
            p_slug: slug,
            p_user_id: v.userId,
            p_valor: v.valor,
            p_descricao: v.descricao?.trim() || undefined,
          });
          if (error) throw error;
          const r = (data ?? {}) as { ok?: boolean; erro?: string; saldo_a_devolver?: number; saldo_restante?: number };
          if (!r.ok) {
            let m = msg(r.erro, "Não foi possível registrar a devolução");
            if (r.erro === "excede_saldo" && r.saldo_a_devolver != null) m += ` (saldo: ${brl(Number(r.saldo_a_devolver))})`;
            throw new Error(m);
          }
          return { saldoRestante: Number(r.saldo_restante ?? 0) };
        },
        enviarEmail: async (comprovantePath) => {
          const { data, error } = await supabase.functions.invoke("enviar-email-devolucao", {
            body: { slug, user_id: v.userId, valor: v.valor, comprovante_path: comprovantePath },
          });
          if (error || !(data as { ok?: boolean } | null)?.ok) throw new Error("Falha ao enviar e-mail de devolução");
        },
      });
      return { ...registro.resultado, emailEnviado: registro.emailEnviado };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-devolucoes", slug] });
      qc.invalidateQueries({ queryKey: ["admin-financeiro"] });
    },
  });
}

export class JaEnviadoError extends Error {}

export function useEnviarEmailCancelamento(slug: string) {
  return useMutation({
    mutationFn: async (v: { motivo: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("enviar-email-cancelamento", {
        body: { slug, motivo: v.motivo, force: v.force ?? false },
      });
      let r = (data ?? {}) as { ok?: boolean; erro?: string; enviados?: number; falhas?: number };
      if (error) {
        try {
          r = await (error as any).context?.json?.();
        } catch {
          throw new Error("Falha ao chamar o envio de e-mails");
        }
      }
      if (!r?.ok) {
        if (r?.erro === "ja_enviado") throw new JaEnviadoError(msg("ja_enviado"));
        throw new Error(msg(r?.erro, "Falha ao enviar e-mails"));
      }
      return { enviados: Number(r.enviados ?? 0), falhas: Number(r.falhas ?? 0) };
    },
  });
}
