import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePremio() {
  return useQuery({
    queryKey: ["premio"],
    queryFn: async () => {
      const [{ data: pays }, { data: setting }] = await Promise.all([
        supabase.from("payments").select("status, valor"),
        supabase.from("settings").select("value").eq("key", "prize_distribution").maybeSingle(),
      ]);
      const aprovados = (pays ?? []).filter((p) => p.status === "aprovado");
      const pendentes = (pays ?? []).filter((p) => p.status === "pendente");
      const total_confirmado = aprovados.reduce((s, p) => s + Number(p.valor), 0);
      const total_pendente = pendentes.reduce((s, p) => s + Number(p.valor), 0);
      const dist = (setting?.value as any) ?? null;
      return {
        total_confirmado,
        total_pendente,
        meta: dist?.meta_arrecadacao ?? 5000,
        custos: dist?.custos ?? 0,
        quotas_pagas: aprovados.length,
        quotas_pendentes: pendentes.length,
        distribuicao: dist
          ? [
              { id: "primeiro" as const, label: "1º lugar", pct: dist.campeao_pct ?? 50 },
              { id: "segundo" as const, label: "2º lugar", pct: dist.vice_pct ?? 25 },
              { id: "terceiro" as const, label: "3º lugar", pct: dist.terceiro_pct ?? 15 },
              { id: "lanterna" as const, label: "Lanterninha", pct: dist.lanterninha_pct ?? 10 },
            ]
          : [
              { id: "primeiro" as const, label: "1º lugar", pct: 50 },
              { id: "segundo" as const, label: "2º lugar", pct: 25 },
              { id: "terceiro" as const, label: "3º lugar", pct: 15 },
              { id: "lanterna" as const, label: "Lanterninha", pct: 10 },
            ],
        atualizado_em: new Date().toISOString(),
      };
    },
  });
}
