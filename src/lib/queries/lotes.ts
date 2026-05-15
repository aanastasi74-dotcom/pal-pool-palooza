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

      // I.5.2 — RPC atômica: numera quotas, cria/atualiza payments e atualiza lote.
      const { data, error } = await (supabase as any).rpc("enviar_comprovante_lote", {
        p_lote_id: loteId,
        p_comprovante_url: path,
      });
      if (error) throw error;
      return { loteId, count: (data?.count as number) ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useMyLotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lotes", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_compra")
        .select("*")
        .eq("user_id", user!.id)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

// I.5.3 — Aprovação via RPC atômica `aprovar_lote`.
export function useApproveLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, aprovarN }: { loteId: string; aprovarN?: number }) => {
      const { data, error } = await (supabase as any).rpc("aprovar_lote", {
        p_lote_id: loteId,
        p_aprovar_n: aprovarN ?? null,
      });
      if (error) throw error;
      // Best-effort email
      supabase.functions
        .invoke("send-pagamento-aprovado-email", { body: { lote_id: loteId } })
        .catch(() => {});
      return {
        loteId,
        aprovadas: (data?.aprovadas as number) ?? 0,
        rejeitadas: (data?.rejeitadas as number) ?? 0,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}

// I.5.3b — Rejeição via RPC `rejeitar_lote` (3-strike por lote).
export function useRejectLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, motivo }: { loteId: string; motivo: string }) => {
      const { data, error } = await (supabase as any).rpc("rejeitar_lote", {
        p_lote_id: loteId,
        p_motivo: motivo,
      });
      if (error) throw error;
      supabase.functions
        .invoke("send-pagamento-rejeitado-email", { body: { lote_id: loteId, motivo } })
        .catch(() => {});
      return { loteId, encerrado: !!data?.encerrado };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}

// I.5.4 — Ativação manual de quota (admin).
export function useAtivarQuotaManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quotaId, motivo }: { quotaId: string; motivo: string }) => {
      const { data, error } = await (supabase as any).rpc("ativar_quota_manual", {
        p_quota_id: quotaId,
        p_motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

// I.5.5 — Encerrar lote por decisão admin (sem strike).
export function useEncerrarLotePorDecisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, motivo }: { loteId: string; motivo: string }) => {
      const { data, error } = await (supabase as any).rpc("encerrar_lote_por_decisao", {
        p_lote_id: loteId,
        p_motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

// I.7 — Encerrar quota manualmente (admin) via RPC encerrar_quota_manual.
export function useEncerrarQuotaManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quotaId, motivo }: { quotaId: string; motivo: string }) => {
      const { data, error } = await (supabase as any).rpc("encerrar_quota_manual", {
        p_quota_id: quotaId,
        p_motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

// Lista quotas (admin) com filtros, pra tela /app/admin/quotas.
export function useAdminQuotasList(filters?: { status?: string; userId?: string }) {
  return useQuery({
    queryKey: ["quotas", "admin-list", filters],
    queryFn: async () => {
      let q = supabase.from("quotas").select("*").order("created_at", { ascending: false }).limit(500);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.userId) q = q.eq("user_id", filters.userId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
      if (userIds.length === 0) return rows;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome, apelido, email")
        .in("id", userIds);
      const pm = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r: any) => ({ ...r, profile: pm.get(r.user_id) ?? null }));
    },
  });
}
