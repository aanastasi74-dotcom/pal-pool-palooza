import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePremio() {
  return useQuery({
    queryKey: ["premio"],
    queryFn: async () => {
      const [atualRes, potencialRes, qtRes, settingRes] = await Promise.all([
        (supabase as any).rpc("get_arrecadacao_atual"),
        (supabase as any).rpc("get_arrecadacao_potencial"),
        supabase.from("quotas").select("status"),
        supabase.from("settings").select("value").eq("key", "prize_distribution").maybeSingle(),
      ]);
      if (atualRes.error) throw atualRes.error;
      if (potencialRes.error) throw potencialRes.error;
      const total_confirmado = Number(atualRes.data ?? 0);
      const total_potencial = Number(potencialRes.data ?? 0);
      const total_pendente = Math.max(0, total_potencial - total_confirmado);
      const list = qtRes.data ?? [];
      const quotas_pagas = list.filter((q: any) => q.status === "ativa").length;
      const quotas_pendentes = list.filter((q: any) =>
        q.status === "aguardando_aprovacao" || q.status === "rejeitada",
      ).length;
      const dist = (settingRes.data?.value as any) ?? null;
      return {
        total_confirmado,
        total_pendente,
        meta: dist?.meta_arrecadacao ?? 5000,
        custos: dist?.custos ?? 0,
        quotas_pagas,
        quotas_pendentes,
        distribuicao: [
          { id: "primeiro" as const, label: "1º lugar", pct: dist?.campeao_pct ?? 50 },
          { id: "segundo" as const, label: "2º lugar", pct: dist?.vice_pct ?? 25 },
          { id: "terceiro" as const, label: "3º lugar", pct: dist?.terceiro_pct ?? 15 },
          { id: "lanterna" as const, label: "Lanterninha", pct: dist?.lanterninha_pct ?? 10 },
        ],
        atualizado_em: new Date().toISOString(),
      };
    },
  });
}
