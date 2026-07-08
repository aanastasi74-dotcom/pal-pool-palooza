import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, ExternalLink, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetting } from "@/lib/queries/settings";
import { useBoletimEncerramento } from "@/lib/queries/boletim-encerramento";

export function EtapaBoletimEncerramento() {
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: boletim, refetch } = useBoletimEncerramento();
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  if (!copaEncerrada) {
    return <p className="text-sm text-muted-foreground">Complete a etapa 2 primeiro.</p>;
  }

  const gerar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-boletim-encerramento", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Boletim de encerramento gerado como rascunho ✅");
      qc.invalidateQueries({ queryKey: ["boletim-encerramento"] });
      qc.invalidateQueries({ queryKey: ["boletins"] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao gerar boletim.");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel: Record<string, string> = {
    rascunho: "📝 Rascunho",
    agendado: "⏱ Agendado",
    publicado: "✅ Publicado",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gera um boletim especial de encerramento (rascunho) usando o snapshot oficial. Você revisa e publica pelo editor.
      </p>

      {boletim ? (
        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-display font-bold">
                {boletim.titulo_customizado ?? "Boletim de encerramento"}
              </p>
              <p className="text-xs text-muted-foreground">
                Data ref: {new Date(boletim.data_referencia).toLocaleDateString("pt-BR")} ·{" "}
                {statusLabel[boletim.status] ?? boletim.status}
                {boletim.publicado_em && (
                  <> · publicado em {new Date(boletim.publicado_em).toLocaleString("pt-BR")}</>
                )}
              </p>
            </div>
            <Link
              to="/app/admin/boletins"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Abrir editor <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum boletim de encerramento ainda.</p>
      )}

      <button
        onClick={gerar}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        <Wand2 className="h-4 w-4" />
        {loading ? "Gerando…" : boletim ? "Regenerar rascunho" : "Gerar boletim de encerramento"}
      </button>
    </div>
  );
}
