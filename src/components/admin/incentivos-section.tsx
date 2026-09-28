import { useState } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import {
  brl,
  type PromotorApurado,
  useApuracaoIncentivos,
  useLancarIncentivo,
} from "@/lib/queries/admin-financeiro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TIPO_LABEL: Record<string, string> = {
  nenhum: "Nenhum",
  desconto_quota: "Desconto em quota",
  quota_extra: "Quota extra",
  comissao: "Comissão",
};

export function IncentivosSection({ slug }: { slug: string }) {
  const { data, isLoading, error } = useApuracaoIncentivos(slug);
  const lancar = useLancarIncentivo(slug);
  const [alvo, setAlvo] = useState<PromotorApurado | null>(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  const tipo = data?.incentivo?.tipo ?? "nenhum";
  const quotaExtra = tipo === "quota_extra";
  const somenteLeitura = data?.status === "arquivada" || data?.status === "encerrada";

  const abrir = (p: PromotorApurado) => {
    setAlvo(p);
    setValor(p.saldo_a_lancar.toFixed(2));
    setDescricao("");
  };

  const confirmar = async () => {
    if (!alvo) return;
    const v = quotaExtra ? 0 : Number(valor.replace(",", "."));
    if (!quotaExtra && (!Number.isFinite(v) || v <= 0)) return toast.error("Informe um valor maior que zero");
    if (!quotaExtra && v > alvo.saldo_a_lancar + 0.001) return toast.error(`O valor excede o saldo (${brl(alvo.saldo_a_lancar)})`);
    try {
      const r = await lancar.mutateAsync({ promotorId: alvo.promotor_id, valor: v, descricao });
      toast.success(
        quotaExtra
          ? `Quota bonificada registrada para ${alvo.apelido ?? "o promotor"}.`
          : `Lançado ${brl(Number(r.valor ?? v))} para ${alvo.apelido ?? "o promotor"}.`,
      );
      setAlvo(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar o incentivo");
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <HandCoins className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="font-display text-lg font-bold">Incentivos</h2>
        {somenteLeitura && <span className="text-xs text-muted-foreground">(somente leitura)</span>}
      </div>

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : error ? (
        <p className="text-sm text-destructive">Não foi possível apurar os incentivos.</p>
      ) : tipo === "nenhum" ? (
        <EmptyState
          title="Sem incentivo configurado"
          description="Configure o tipo e o valor por adesão na seção Promotores."
        />
      ) : (data?.promotores ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum promotor com adesões ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-2">Promotor</th>
                <th className="py-2 pr-2 text-right">Adesões</th>
                <th className="py-2 pr-2 text-right">Devido</th>
                <th className="py-2 pr-2 text-right">Lançado</th>
                <th className="py-2 pr-2 text-right">Saldo</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(data?.promotores ?? []).map((p) => (
                <tr key={p.promotor_id} className="border-t border-border">
                  <td className="py-2 pr-2">
                    <p className="font-semibold">{p.apelido ?? "—"}</p>
                    {p.nome && <p className="text-xs text-muted-foreground">{p.nome}</p>}
                  </td>
                  <td className="py-2 pr-2 text-right">{p.adesoes}</td>
                  <td className="py-2 pr-2 text-right">{brl(p.valor_devido)}</td>
                  <td className="py-2 pr-2 text-right">{brl(p.ja_lancado)}</td>
                  <td className="py-2 pr-2 text-right font-bold text-primary">{brl(p.saldo_a_lancar)}</td>
                  <td className="py-2 text-right">
                    {!somenteLeitura && (
                      <Button size="sm" disabled={p.saldo_a_lancar <= 0} onClick={() => abrir(p)}>
                        Lançar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.incentivo && tipo !== "nenhum" && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Incentivo: <strong>{TIPO_LABEL[tipo] ?? tipo}</strong> · {brl(data.incentivo.valor_por_adesao)} por adesão · teto{" "}
          {data.incentivo.teto > 0 ? brl(data.incentivo.teto) : "sem teto"}
        </p>
      )}

      <Dialog open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar incentivo — {alvo?.apelido}</DialogTitle>
            <DialogDescription>
              {quotaExtra
                ? "Registro contábil de quota bonificada (valor R$ 0). Nenhum dinheiro sai do caixa."
                : `Saída no caixa da competição. Saldo a lançar: ${brl(alvo?.saldo_a_lancar ?? 0)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!quotaExtra && (
              <label className="block space-y-1 text-sm">
                <span>Valor (R$)</span>
                <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              </label>
            )}
            <label className="block space-y-1 text-sm">
              <span>Descrição (opcional)</span>
              <Input value={descricao} maxLength={200} onChange={(e) => setDescricao(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmar} disabled={lancar.isPending}>
              {lancar.isPending ? "Lançando…" : "Confirmar lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
