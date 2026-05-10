import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useMyPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payments", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePaymentsAdmin() {
  return useQuery({
    queryKey: ["payments", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, profile:profiles!payments_user_id_fkey(nome, apelido, email), quota:quotas(numero)")
        .order("created_at", { ascending: false });
      if (error) {
        // fallback sem join
        const { data: pays, error: e2 } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
        if (e2) throw e2;
        const userIds = Array.from(new Set((pays ?? []).map((p) => p.user_id)));
        const quotaIds = Array.from(new Set((pays ?? []).map((p) => p.quota_id).filter(Boolean) as string[]));
        const [{ data: profs }, { data: qs }] = await Promise.all([
          supabase.from("profiles").select("id, nome, apelido, email").in("id", userIds),
          quotaIds.length ? supabase.from("quotas").select("id, numero").in("id", quotaIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const pm = new Map((profs ?? []).map((p) => [p.id, p]));
        const qm = new Map((qs ?? []).map((q: any) => [q.id, q]));
        return (pays ?? []).map((p) => ({ ...p, profile: pm.get(p.user_id) ?? null, quota: p.quota_id ? qm.get(p.quota_id) ?? null : null }));
      }
      return data ?? [];
    },
  });
}

export function useRecentApprovedPayments(limit = 10) {
  return useQuery({
    queryKey: ["payments", "recent-approved", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments").select("*, quota:quotas(numero), profile:profiles!payments_user_id_fkey(nome, apelido)")
        .eq("status", "aprovado")
        .order("aprovado_em", { ascending: false })
        .limit(limit);
      if (error) {
        const { data: pays } = await supabase.from("payments").select("*").eq("status", "aprovado").order("aprovado_em", { ascending: false }).limit(limit);
        return pays ?? [];
      }
      return data ?? [];
    },
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payment_id: string) => {
      const { data: pay, error } = await supabase
        .from("payments")
        .update({ status: "aprovado", aprovado_em: new Date().toISOString(), aprovado_por: user!.id, motivo_rejeicao: null })
        .eq("id", payment_id).select().single();
      if (error) throw error;
      // ativa a quota associada
      if (pay.quota_id) {
        await supabase.from("quotas").update({ status: "ativa", paga_em: new Date().toISOString() }).eq("id", pay.quota_id);
      }
      // dispara email (best-effort)
      supabase.functions.invoke("send-pagamento-aprovado-email", { body: { payment_id } }).catch(() => {});
      return pay;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ payment_id, motivo }: { payment_id: string; motivo: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update({ status: "rejeitado", motivo_rejeicao: motivo, aprovado_por: user!.id, aprovado_em: new Date().toISOString() })
        .eq("id", payment_id).select().single();
      if (error) throw error;
      supabase.functions.invoke("send-pagamento-rejeitado-email", { body: { payment_id } }).catch(() => {});
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useReversePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payment_id, motivo }: { payment_id: string; motivo?: string }) => {
      const { data, error } = await supabase
        .from("payments").update({ status: "estornado", motivo_rejeicao: motivo ?? null }).eq("id", payment_id).select().single();
      if (error) throw error;
      if (data.quota_id) {
        await supabase.from("quotas").update({ status: "expirada" }).eq("id", data.quota_id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotas"] });
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ quota_id, valor, comprovante_path }: { quota_id: string; valor: number; comprovante_path: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({ user_id: user!.id, quota_id, valor, comprovante_path, status: "pendente" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}
