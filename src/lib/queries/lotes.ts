import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const VALOR_QUOTA = 50;

export type PodeComprarResult = {
  pode: boolean;
  motivo?: string;
  restantes_individual?: number;
  restantes_global?: number;
  quantidade_solicitada?: number;
};

export function usePodeComprarQuota(quantidade: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pode_comprar_quota", user?.id, quantidade],
    enabled: !!user?.id && quantidade >= 1,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("pode_comprar_quota", {
        p_user_id: user!.id,
        p_quantidade: quantidade,
      });
      if (error) throw error;
      return data as PodeComprarResult;
    },
  });
}

export function useCreateOrUpdateLote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (quantidade: number) => {
      if (!user) throw new Error("Não autenticado.");
      const { data: pode, error: errPode } = await (supabase as any).rpc("pode_comprar_quota", {
        p_user_id: user.id,
        p_quantidade: quantidade,
      });
      if (errPode) throw errPode;
      if (pode?.pode === false) throw new Error(pode.motivo ?? "Não é possível comprar agora.");

      // Reuse incompleta lote if exists
      const { data: existing } = await supabase
        .from("lotes_compra")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "incompleta")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      let loteId: string;
      if (existing) {
        loteId = existing.id;
        if (existing.quantidade_pedida !== quantidade) {
          await supabase
            .from("lotes_compra")
            .update({ quantidade_pedida: quantidade, valor_esperado: quantidade * VALOR_QUOTA })
            .eq("id", loteId);
        }
        // Sync quotas count
        const { data: existingQuotas } = await supabase
          .from("quotas")
          .select("id")
          .eq("lote_id", loteId)
          .eq("status", "incompleta");
        const have = existingQuotas?.length ?? 0;
        if (have > quantidade) {
          const toRemove = (existingQuotas ?? []).slice(quantidade).map((q) => q.id);
          if (toRemove.length) await supabase.from("quotas").delete().in("id", toRemove);
        } else if (have < quantidade) {
          const rows = Array.from({ length: quantidade - have }, () => ({
            user_id: user.id,
            lote_id: loteId,
            status: "incompleta" as const,
          }));
          const { error } = await supabase.from("quotas").insert(rows as any);
          if (error) throw error;
        }
      } else {
        const { data: newLote, error: errLote } = await supabase
          .from("lotes_compra")
          .insert({
            user_id: user.id,
            quantidade_pedida: quantidade,
            valor_esperado: quantidade * VALOR_QUOTA,
            status: "incompleta",
          })
          .select()
          .single();
        if (errLote) throw errLote;
        loteId = newLote.id;
        const rows = Array.from({ length: quantidade }, () => ({
          user_id: user.id,
          lote_id: loteId,
          status: "incompleta" as const,
        }));
        const { error } = await supabase.from("quotas").insert(rows as any);
        if (error) throw error;
      }
      return loteId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
    },
  });
}

export function useLote(loteId: string | undefined) {
  return useQuery({
    queryKey: ["lote", loteId],
    enabled: !!loteId,
    queryFn: async () => {
      const { data: lote, error } = await supabase
        .from("lotes_compra")
        .select("*")
        .eq("id", loteId!)
        .maybeSingle();
      if (error) throw error;
      const { data: quotas } = await supabase
        .from("quotas")
        .select("*")
        .eq("lote_id", loteId!)
        .order("created_at", { ascending: true });
      return { lote, quotas: quotas ?? [] };
    },
  });
}

export function useSubmitComprovanteLote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ loteId, file }: { loteId: string; file: File }) => {
      if (!user) throw new Error("Não autenticado.");
      const path = `${user.id}/${loteId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("comprovantes-pix")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      // Get current lote + quotas
      const { data: lote } = await supabase.from("lotes_compra").select("*").eq("id", loteId).single();
      const { data: quotas } = await supabase
        .from("quotas")
        .select("*")
        .eq("lote_id", loteId)
        .eq("status", "incompleta")
        .order("created_at", { ascending: true });
      if (!lote || !quotas || quotas.length === 0) throw new Error("Lote inválido.");

      // Compute starting numero
      const { data: maxRow } = await supabase
        .from("quotas")
        .select("numero")
        .eq("user_id", user.id)
        .in("status", ["aguardando_aprovacao", "ativa", "rejeitada"])
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      let nextNumero = (maxRow?.numero ?? 0) + 1;

      await supabase
        .from("lotes_compra")
        .update({
          status: "aguardando_aprovacao",
          comprovante_url: path,
          tentativas_comprovante: (lote.tentativas_comprovante ?? 0) + 1,
          motivo_rejeicao: null,
        })
        .eq("id", loteId);

      // Update each quota sequentially & insert payment
      for (const q of quotas) {
        await supabase
          .from("quotas")
          .update({ status: "aguardando_aprovacao", numero: nextNumero, motivo_rejeicao: null } as any)
          .eq("id", q.id);
        await supabase.from("payments").insert({
          user_id: user.id,
          quota_id: q.id,
          lote_id: loteId,
          valor: VALOR_QUOTA,
          comprovante_path: path,
          status: "pendente",
        } as any);
        nextNumero += 1;
      }

      return { loteId, count: quotas.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// ---- Admin ----

export function useLotesAguardando() {
  return useQuery({
    queryKey: ["lotes", "aguardando"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_compra")
        .select("*")
        .eq("status", "aguardando_aprovacao")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((l) => l.id);
      if (ids.length === 0) return [];
      const userIds = Array.from(new Set((data ?? []).map((l) => l.user_id)));
      const [{ data: profs }, { data: payments }, { data: quotas }] = await Promise.all([
        supabase.from("profiles").select("id, nome, apelido, email").in("id", userIds),
        supabase.from("payments").select("*").in("lote_id", ids),
        supabase.from("quotas").select("*").in("lote_id", ids),
      ]);
      const pm = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((l) => ({
        ...l,
        profile: pm.get(l.user_id) ?? null,
        payments: (payments ?? []).filter((p: any) => p.lote_id === l.id),
        quotas: (quotas ?? []).filter((q: any) => q.lote_id === l.id),
      }));
    },
  });
}

export function useApproveLote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ loteId, aprovarN }: { loteId: string; aprovarN?: number }) => {
      const { data: quotas } = await supabase
        .from("quotas")
        .select("*")
        .eq("lote_id", loteId)
        .order("numero", { ascending: true });
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("lote_id", loteId);
      if (!quotas || !payments) throw new Error("Lote sem dados.");

      const total = quotas.length;
      const N = aprovarN ?? total;
      const aprovadas = quotas.slice(0, N);
      const rejeitadas = quotas.slice(N);

      const now = new Date().toISOString();

      // Approve payments first (FK trigger requires payment aprovado before quota ativa)
      const aprovadasIds = new Set(aprovadas.map((q) => q.id));
      const payAprovIds = payments.filter((p: any) => aprovadasIds.has(p.quota_id)).map((p: any) => p.id);
      if (payAprovIds.length) {
        await supabase
          .from("payments")
          .update({ status: "aprovado", aprovado_em: now, aprovado_por: user!.id, motivo_rejeicao: null })
          .in("id", payAprovIds);
      }
      if (aprovadas.length) {
        await supabase
          .from("quotas")
          .update({ status: "ativa", paga_em: now } as any)
          .in("id", aprovadas.map((q) => q.id));
      }

      if (rejeitadas.length) {
        const motivo = `Pagamento parcial — apenas ${N} de ${total} quotas aprovadas.`;
        // Reject remaining payments
        const payRejIds = payments
          .filter((p: any) => !aprovadasIds.has(p.quota_id))
          .map((p: any) => p.id);
        if (payRejIds.length) {
          await supabase
            .from("payments")
            .update({ status: "rejeitado", motivo_rejeicao: motivo, aprovado_por: user!.id, aprovado_em: now })
            .in("id", payRejIds);
        }
        for (const q of rejeitadas) {
          const novas = (q.tentativas_comprovante ?? 0) + 1;
          const novoStatus = novas >= 3 ? "encerrada" : "rejeitada";
          await supabase
            .from("quotas")
            .update({ status: novoStatus, motivo_rejeicao: motivo, tentativas_comprovante: novas } as any)
            .eq("id", q.id);
        }
      }

      const novoStatusLote =
        rejeitadas.length === 0 ? "aprovado_total" : "aprovado_parcial";
      await supabase
        .from("lotes_compra")
        .update({ status: novoStatusLote, decidido_em: now })
        .eq("id", loteId);

      // Best-effort email
      if (payAprovIds.length) {
        supabase.functions
          .invoke("send-pagamento-aprovado-email", {
            body: { lote_id: loteId, payment_ids: payAprovIds, count: aprovadas.length },
          })
          .catch(() => {});
      }
      return { loteId, aprovadas: aprovadas.length, rejeitadas: rejeitadas.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}

export function useRejectLote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ loteId, motivo }: { loteId: string; motivo: string }) => {
      const { data: lote } = await supabase
        .from("lotes_compra")
        .select("*")
        .eq("id", loteId)
        .single();
      const { data: quotas } = await supabase.from("quotas").select("*").eq("lote_id", loteId);
      const { data: payments } = await supabase.from("payments").select("*").eq("lote_id", loteId);
      if (!lote || !quotas || !payments) throw new Error("Lote sem dados.");

      const now = new Date().toISOString();
      const novasTent = (lote.tentativas_comprovante ?? 0) + 1;

      await supabase
        .from("lotes_compra")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo,
          tentativas_comprovante: novasTent,
          decidido_em: now,
        })
        .eq("id", loteId);

      if (payments.length) {
        await supabase
          .from("payments")
          .update({ status: "rejeitado", motivo_rejeicao: motivo, aprovado_por: user!.id, aprovado_em: now })
          .in("id", payments.map((p: any) => p.id));
      }

      for (const q of quotas) {
        const novas = (q.tentativas_comprovante ?? 0) + 1;
        const novoStatus = novas >= 3 ? "encerrada" : "rejeitada";
        await supabase
          .from("quotas")
          .update({ status: novoStatus, motivo_rejeicao: motivo, tentativas_comprovante: novas } as any)
          .eq("id", q.id);
      }

      supabase.functions
        .invoke("send-pagamento-rejeitado-email", {
          body: { lote_id: loteId, payment_ids: payments.map((p: any) => p.id), motivo },
        })
        .catch(() => {});
      return { loteId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}
