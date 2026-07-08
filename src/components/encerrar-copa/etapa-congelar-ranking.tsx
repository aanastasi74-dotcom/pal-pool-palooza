import { useState } from "react";
import { Snowflake, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetting } from "@/lib/queries/settings";
import { usePremiacao, fmtBRL } from "@/lib/queries/premiacao";
import { usePremiados, CATEGORIAS_ORDER, CATEGORIA_META } from "@/lib/queries/premiados";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function EtapaCongelarRanking() {
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: premiacaoPreview } = usePremiacao();
  const { data: premiados = [] } = usePremiados();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const congelar = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("congelar_ranking_oficial");
      if (error) throw error;
      const result = data as { status?: string };
      if (result?.status === "noop") {
        toast.info("Ranking já estava congelado.");
      } else {
        toast.success("Ranking congelado ✅");
      }
      qc.invalidateQueries({ queryKey: ["premiados"] });
      qc.invalidateQueries({ queryKey: ["ranking-final"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings", "copa_encerrada"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao congelar ranking.");
    } finally {
      setLoading(false);
    }
  };

  if (copaEncerrada) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
          ✅ Ranking oficial congelado. Snapshot criado em <b>ranking_final</b> e 6 premiados registrados.
        </div>
        <div className="rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Pereba</th>
                <th className="px-3 py-2 text-right">Prêmio</th>
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
                      {p ? (
                        <>
                          <span className="font-semibold">{p.apelido}</span>
                          <span className="ml-1 text-xs text-muted-foreground">#{p.numero_quota}</span>
                          {cat === "lanterninha" && p.posicao != null && (
                            <span className="ml-1 text-xs text-muted-foreground">· pos {p.posicao}º (§9)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-display font-bold">
                      {p ? fmtBRL(p.valor_total) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">Ação irreversível</p>
          <p className="text-destructive/80">
            Vai criar o snapshot oficial em <b>ranking_final</b> e definir os 6 premiados. Só admin desfaz via SQL.
          </p>
        </div>
      </div>

      {premiacaoPreview && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Preview (estimativa — valores só travam ao congelar)
          </p>
          <div className="rounded-2xl border border-border p-3 text-sm">
            <div className="flex justify-between py-1">
              <span>🏆 1º lugar</span>
              <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.primeiro_total)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>🥈 2º lugar</span>
              <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.segundo)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>🥉 3º lugar</span>
              <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.terceiro)}</span>
            </div>
            {premiacaoPreview.premios.quarto > 0 && (
              <div className="flex justify-between py-1">
                <span>🎖️ 4º lugar</span>
                <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.quarto)}</span>
              </div>
            )}
            {premiacaoPreview.premios.quinto > 0 && (
              <div className="flex justify-between py-1">
                <span>🎖️ 5º lugar</span>
                <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.quinto)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>🐔 Lanterninha</span>
              <span className="font-display font-bold">{fmtBRL(premiacaoPreview.premios.lanterninha)}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground shadow-glow disabled:opacity-50"
      >
        <Snowflake className="h-4 w-4" />
        {loading ? "Congelando…" : "Congelar Ranking Oficial"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Congelar ranking oficial?"
        description="Isso vai criar o snapshot imutável do ranking, definir os 6 premiados e marcar copa_encerrada=true. Ação IRREVERSÍVEL via UI (só admin desfaz por SQL). Confirmar?"
        confirmLabel="Sim, congelar"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          congelar();
        }}
      />
    </div>
  );
}
