import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, isSaida, useFinanceiroPlataforma } from "@/lib/queries/admin-financeiro";

export const Route = createFileRoute("/app/admin/financeiro")({
  head: () => ({ meta: [{ title: "Admin — Financeiro" }] }),
  component: FinanceiroPlataforma,
});

type Totais = { entradas: number; saidas: number };

function FinanceiroPlataforma() {
  const { data, isLoading, error } = useFinanceiroPlataforma();
  const [comp, setComp] = useState("todas");
  const [cat, setCat] = useState("todas");

  const { porComp, total, nomes, categorias } = useMemo(() => {
    const porComp = new Map<string, Totais>();
    const total: Totais = { entradas: 0, saidas: 0 };
    const cats = new Set<string>();
    for (const m of data?.movimentos ?? []) {
      const t = porComp.get(m.competicao_id) ?? { entradas: 0, saidas: 0 };
      const v = Math.abs(Number(m.valor));
      if (isSaida(m.tipo)) { t.saidas += v; total.saidas += v; } else { t.entradas += v; total.entradas += v; }
      porComp.set(m.competicao_id, t);
      cats.add(m.categoria);
    }
    const nomes = new Map((data?.competicoes ?? []).map((c) => [c.id, c.nome_curto]));
    return { porComp, total, nomes, categorias: [...cats].sort() };
  }, [data]);

  const filtrados = useMemo(
    () =>
      (data?.movimentos ?? [])
        .filter((m) => (comp === "todas" || m.competicao_id === comp) && (cat === "todas" || m.categoria === cat))
        .slice(0, 200),
    [data, comp, cat],
  );

  if (isLoading) return <Skeleton className="h-64" />;
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar o financeiro.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consolidado do caixa de todas as competições (consulta).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CardTotais titulo="Total da plataforma" t={total} destaque />
        {(data?.competicoes ?? [])
          .filter((c) => porComp.has(c.id))
          .map((c) => <CardTotais key={c.id} titulo={c.nome_curto} t={porComp.get(c.id)!} />)}
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-display text-lg font-bold">Últimos movimentos</h2>
          <Select value={comp} onValueChange={setComp}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas competições</SelectItem>
              {(data?.competicoes ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_curto}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum movimento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 pr-2">Competição</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Categoria</th>
                  <th className="py-2 pr-2">Descrição</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => {
                  const saida = isSaida(m.tipo);
                  const v = Math.abs(Number(m.valor));
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-2 pr-2 whitespace-nowrap">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 pr-2">{nomes.get(m.competicao_id) ?? "—"}</td>
                      <td className="py-2 pr-2">{m.tipo}</td>
                      <td className="py-2 pr-2">{m.categoria}</td>
                      <td className="py-2 pr-2 break-words">{m.descricao}</td>
                      <td className={`py-2 text-right font-semibold whitespace-nowrap ${saida ? "text-destructive" : "text-success"}`}>
                        {saida ? "−" : "+"} {brl(v)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CardTotais({ titulo, t, destaque }: { titulo: string; t: Totais; destaque?: boolean }) {
  const saldo = t.entradas - t.saidas;
  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-card ${destaque ? "border-primary" : "border-border"}`}>
      <p className="font-display font-bold break-words">{titulo}</p>
      <div className="mt-2 space-y-0.5 text-sm">
        <p className="flex justify-between"><span className="text-muted-foreground">Entradas</span><span className="text-success">{brl(t.entradas)}</span></p>
        <p className="flex justify-between"><span className="text-muted-foreground">Saídas</span><span className="text-destructive">{brl(t.saidas)}</span></p>
        <p className="flex justify-between border-t border-border pt-1 font-bold"><span>Saldo</span><span>{brl(saldo)}</span></p>
      </div>
    </div>
  );
}
