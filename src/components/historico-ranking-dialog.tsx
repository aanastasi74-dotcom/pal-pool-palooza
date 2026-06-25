import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

type Snapshot = {
  data_snapshot: string;
  posicao: number;
  pontos: number;
  total_quotas_ativas: number;
};

function formatDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function HistoricoRankingDialog({
  open,
  onOpenChange,
  quotaId,
  numero,
  apelido,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quotaId: string;
  numero: number;
  apelido: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["historico-ranking", quotaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_historico_ranking_quota", { p_quota_id: quotaId });
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
    enabled: open,
  });

  const serie = data ?? [];
  const ultimo = serie[serie.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <TrendingUp className="h-5 w-5" />
            Evolução do ranking — Quota #{numero}
          </DialogTitle>
          <DialogDescription>{apelido}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : serie.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            📊 Ainda sem histórico pra essa quota. O snapshot diário é tirado às 5h BRT — volta amanhã pra ver a evolução.
          </div>
        ) : (
          <>
            {ultimo && (
              <p className="text-sm text-muted-foreground">
                Estado atual: <span className="font-display font-bold text-foreground">{ultimo.posicao}º</span> ·{" "}
                <span className="font-display font-bold text-foreground">{ultimo.pontos.toLocaleString("pt-BR")}</span> pts
                <span className="ml-1 text-xs">de {ultimo.total_quotas_ativas} quotas</span>
              </p>
            )}
            {serie.length === 1 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                📊 Primeiro registro: {formatDia(serie[0].data_snapshot)}. A evolução vai aparecer com o passar dos dias.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie.map((s) => ({ ...s, dia: formatDia(s.data_snapshot) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis
                      reversed
                      domain={[1, ultimo?.total_quotas_ativas ?? "auto"]}
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                      label={{ value: "Posição", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number, name: string) => {
                        if (name === "posicao") return [`${value}º`, "Posição"];
                        return [value, name];
                      }}
                      labelFormatter={(l) => `Dia ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="posicao"
                      stroke="oklch(0.6 0.16 200)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
