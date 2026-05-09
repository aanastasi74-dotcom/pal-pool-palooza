import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { pagamentosAdmin, type PagamentoAdmin } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Admin — Pagamentos" }] }),
  component: Pagamentos,
});

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
const statusColor: Record<string, string> = {
  aprovado: "bg-success/15 text-success",
  pendente: "bg-accent/15 text-accent",
  rejeitado: "bg-destructive/15 text-destructive",
  estornado: "bg-muted text-muted-foreground",
};

function Pagamentos() {
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [aberto, setAberto] = useState<PagamentoAdmin | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtrados = useMemo(() => {
    return pagamentosAdmin.filter((p) => {
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (busca && !p.participante.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [filtroStatus, busca]);

  const toggle = (id: string) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const aprovarMassa = () => {
    toast.success("Aprovado! O caldeirão tá engordando.");
    setSelecionados([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Conciliação dos Pix da perebada.</p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Upload className="h-3 w-3" /> Importar extrato Pix (CSV)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todos">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
          <option value="estornado">Estornado</option>
        </select>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar participante…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        {selecionados.length > 0 && (
          <div className="ml-auto flex gap-2">
            <span className="text-xs text-muted-foreground">{selecionados.length} selecionado(s)</span>
            <button onClick={aprovarMassa} className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">Aprovar</button>
            <button onClick={() => { toast.info("Marcados como rejeitados."); setSelecionados([]); }} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">Rejeitar</button>
            <button onClick={() => { toast.info("Marcados como estornados."); setSelecionados([]); }} className="rounded-full border border-border px-3 py-1 text-xs font-bold">Estornar</button>
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Sem pagamentos por aqui" description="A perebada ainda não Pixou." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 p-3"></th>
                <th className="p-3 text-left">Participante</th>
                <th className="p-3 text-left">Quota</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={selecionados.includes(p.id)} onCheckedChange={() => toggle(p.id)} /></td>
                  <td className="cursor-pointer p-3 font-medium" onClick={() => setAberto(p)}>{p.participante}</td>
                  <td className="cursor-pointer p-3 text-muted-foreground" onClick={() => setAberto(p)}>{p.quota_label}</td>
                  <td className="cursor-pointer p-3 text-right font-display font-bold" onClick={() => setAberto(p)}>{fmt(p.valor)}</td>
                  <td className="cursor-pointer p-3 text-xs text-muted-foreground" onClick={() => setAberto(p)}>{p.data}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[p.status]}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <SheetContent className="w-[420px] sm:max-w-md">
          {aberto && (
            <>
              <SheetHeader>
                <SheetTitle>{aberto.quota_label}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Participante</span><b>{aberto.participante}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><b>{fmt(aberto.valor)}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{aberto.data}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[aberto.status]}`}>{aberto.status}</span></div>
                {aberto.aprovado_por && <div className="flex justify-between"><span className="text-muted-foreground">Aprovado por</span><span>{aberto.aprovado_por}</span></div>}
                {aberto.motivo_rejeicao && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">Motivo: {aberto.motivo_rejeicao}</div>}
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8" /> Pré-visualização do comprovante (mock)
                </div>
                {aberto.status === "pendente" && (
                  <div className="flex gap-2">
                    <button onClick={() => { toast.success("Aprovado! O caldeirão tá engordando."); setAberto(null); }} className="flex-1 rounded-full bg-success px-4 py-2 text-xs font-bold text-success-foreground">Aprovar</button>
                    <button onClick={() => { toast.info("Pagamento rejeitado."); setAberto(null); }} className="flex-1 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground">Rejeitar</button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar extrato Pix (CSV)</DialogTitle></DialogHeader>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm">Arraste o CSV aqui ou <button className="text-primary underline">selecione</button></p>
          </div>
          <p className="text-xs font-bold">Pré-visualização (3 matches encontrados)</p>
          <div className="rounded-lg border border-border text-xs">
            <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/50 p-2 font-semibold"><span>Data</span><span>Pagador</span><span>Valor</span></div>
            <div className="grid grid-cols-3 gap-2 border-b border-border p-2"><span>13/06 14:00</span><span>Marina Souza</span><span>R$ 50,00</span></div>
            <div className="grid grid-cols-3 gap-2 border-b border-border p-2"><span>13/06 12:30</span><span>Aninha Lima</span><span>R$ 50,00</span></div>
            <div className="grid grid-cols-3 gap-2 p-2"><span>12/06 18:00</span><span>Pedro</span><span>R$ 50,00</span></div>
          </div>
          <button onClick={() => { toast.success("Conciliação aplicada — 3 pagamentos aprovados."); setImportOpen(false); }} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Confirmar conciliação</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
