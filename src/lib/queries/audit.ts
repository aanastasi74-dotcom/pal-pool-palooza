import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAuditLog(filters?: { acao?: string; ator_id?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (filters?.acao) q = q.eq("acao", filters.acao);
      if (filters?.ator_id) q = q.eq("ator_id", filters.ator_id);
      if (filters?.from) q = q.gte("created_at", filters.from);
      if (filters?.to) q = q.lte("created_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
