import { useState } from "react";
import { Mail, Send, Eye, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetting } from "@/lib/queries/settings";
import { usePremiados, CATEGORIAS_ORDER, CATEGORIA_META, CategoriaPremiado } from "@/lib/queries/premiados";
import { fmtBRL } from "@/lib/queries/premiacao";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function EtapaNotificarPremiados() {
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: premiados = [] } = usePremiados();
  const qc = useQueryClient();

  const [previewCat, setPreviewCat] = useState<CategoriaPremiado>("primeiro");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingTeste, setLoadingTeste] = useState(false);
  const [loadingEnviar, setLoadingEnviar] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<any>(null);

  if (!copaEncerrada) {
    return <p className="text-sm text-muted-foreground">Complete a etapa 2 primeiro.</p>;
  }

  const verPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke("notificar-premiados", {
        body: { action: "preview_email", categoria: previewCat },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreviewHtml((data as any).html ?? "");
      setPreviewSubject((data as any).subject ?? "");
      setPreviewOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao gerar preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const enviarTeste = async () => {
    setLoadingTeste(true);
    try {
      const { data, error } = await supabase.functions.invoke("notificar-premiados", {
        body: { action: "teste" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Email de teste enviado pro aanastasi74@me.com — checa sua caixa.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao enviar teste.");
    } finally {
      setLoadingTeste(false);
    }
  };

  const enviarPraTodos = async () => {
    setLoadingEnviar(true);
    try {
      const { data, error } = await supabase.functions.invoke("notificar-premiados", {
        body: { action: "enviar" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as any;
      setUltimoResultado(r);
      toast.success(`Enviados: ${r.enviados ?? 0} · Pulados: ${r.pulados ?? 0} · Erros: ${r.erros?.length ?? 0}`);
      qc.invalidateQueries({ queryKey: ["premiados"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao enviar emails.");
    } finally {
      setLoadingEnviar(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Pereba</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-left">Notificado</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS_ORDER.map((cat) => {
              const p = premiados.find((x) => x.categoria === cat);
              const meta = CATEGORIA_META[cat];
              return (
                <tr key={cat} className="border-t border-border">
                  <td className="px-3 py-2">{meta.emoji} {meta.label}</td>
                  <td className="px-3 py-2">
                    {p ? <><span className="font-semibold">{p.apelido}</span> <span className="text-xs text-muted-foreground">#{p.numero_quota}</span></> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-display font-bold">
                    {p ? fmtBRL(p.valor_total) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {p?.data_notificacao ? (
                      <span className="text-success">✅ {new Date(p.data_notificacao).toLocaleString("pt-BR")}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={previewCat}
          onChange={(e) => setPreviewCat(e.target.value as CategoriaPremiado)}
          className="rounded-full border border-border bg-secondary px-3 py-2 text-sm font-semibold"
        >
          {CATEGORIAS_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_META[c].emoji} {CATEGORIA_META[c].label}
            </option>
          ))}
        </select>
        <button
          onClick={verPreview}
          disabled={loadingPreview}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5" />
          {loadingPreview ? "Carregando…" : "Ver preview do email"}
        </button>
        <button
          onClick={enviarTeste}
          disabled={loadingTeste}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <TestTube className="h-3.5 w-3.5" />
          {loadingTeste ? "Enviando…" : "Enviar email de teste (só pra mim)"}
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loadingEnviar}
          className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground shadow-glow disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {loadingEnviar ? "Enviando…" : "Enviar aos 6 premiados agora"}
        </button>
      </div>

      {ultimoResultado?.erros?.length > 0 && (
        <details className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-destructive">
            Erros no último envio ({ultimoResultado.erros.length})
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(ultimoResultado.erros, null, 2)}
          </pre>
        </details>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Enviar emails aos premiados?"
        description="Isso vai mandar emails DE VERDADE pros 6 premiados (categorias já notificadas são puladas). Confirmar?"
        confirmLabel="Sim, enviar"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          enviarPraTodos();
        }}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {previewSubject || "Preview"}
            </DialogTitle>
          </DialogHeader>
          <div
            className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-white p-4 text-black"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
