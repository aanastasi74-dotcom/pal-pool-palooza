import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Crown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/lib/queries/teams";
import { useSetting, useUpdateSetting } from "@/lib/queries/settings";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/encerrar-copa")({
  head: () => ({ meta: [{ title: "Encerrar Copa — Admin" }] }),
  component: EncerrarCopaPage,
});

type Top4Oficial = {
  campeao: string | null;
  vice: string | null;
  terceiro: string | null;
  quarto: string | null;
};

const LABELS = ["Campeão", "Vice", "3º lugar", "4º lugar"] as const;
const KEYS: (keyof Top4Oficial)[] = ["campeao", "vice", "terceiro", "quarto"];

function EncerrarCopaPage() {
  const { data: teams = [], isLoading: loadingTeams } = useTeams();
  const { data: oficial, isLoading: loadingS } = useSetting<Top4Oficial>("top4_oficial");
  const updateSetting = useUpdateSetting();
  const [picks, setPicks] = useState<string[]>(["", "", "", ""]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countPalpites, setCountPalpites] = useState<number | null>(null);

  useEffect(() => {
    setPicks([
      oficial?.campeao ?? "",
      oficial?.vice ?? "",
      oficial?.terceiro ?? "",
      oficial?.quarto ?? "",
    ]);
  }, [oficial]);

  useEffect(() => {
    supabase
      .from("top4_predictions")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setCountPalpites(count ?? 0));
  }, []);

  const teamsSorted = useMemo(
    () => [...teams].sort((a, b) => a.nome_pt.localeCompare(b.nome_pt, "pt-BR")),
    [teams],
  );

  if (loadingTeams || loadingS) return <Skeleton className="h-96 w-full" />;

  const setPos = (i: number, v: string) => {
    const idxAntigo = picks.indexOf(v);
    const next = [...picks];
    if (v && idxAntigo !== -1 && idxAntigo !== i) {
      next[idxAntigo] = picks[i];
      next[i] = v;
      toast.info(`Trocado com ${LABELS[idxAntigo]}.`);
    } else {
      next[i] = v;
    }
    setPicks(next);
  };

  const validar = (): boolean => {
    if (picks.some((p) => !p)) {
      toast.error("Preenche as 4 posições do Top 4 oficial.");
      return false;
    }
    if (new Set(picks).size !== 4) {
      toast.error("Cada time só pode aparecer uma vez.");
      return false;
    }
    return true;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      const value: Top4Oficial = {
        campeao: picks[0],
        vice: picks[1],
        terceiro: picks[2],
        quarto: picks[3],
      };
      await updateSetting.mutateAsync({ key: "top4_oficial", value });
      const { data, error } = await supabase.functions.invoke("calcular-pontos-top4", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        `Top 4 oficial salvo. ${data?.palpites_atualizados ?? 0} palpites e ${data?.quotas_atualizadas ?? 0} quotas recalculados.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou ao calcular pontos do Top 4.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-gold-foreground">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold">Encerrar Copa — Top 4</h1>
          <p className="text-sm text-muted-foreground">
            Defina o pódio oficial. Ao salvar, os pontos do Top 4 de todas as quotas são recalculados.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Ação afeta o ranking</p>
            <p className="text-destructive/80">
              Vai recalcular {countPalpites ?? "—"} palpites Top 4 e atualizar quotas.pontos (jogos + top 4). Pode reeditar
              depois — recalcula novamente.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {picks.map((pick, i) => {
          const selected = teams.find((t) => t.bracket_position === pick);
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-gold-foreground">
                {i + 1}º
              </div>
              <div className="w-24 text-sm font-bold">{LABELS[i]}</div>
              <span className="text-3xl">{selected?.bandeira_emoji ?? "🏳️"}</span>
              <select
                value={pick}
                onChange={(e) => setPos(i, e.target.value)}
                className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">— escolher —</option>
                {teamsSorted.map((t) => {
                  const code = t.bracket_position;
                  const usadoEm = picks.indexOf(code);
                  const desabilitado = usadoEm !== -1 && usadoEm !== i;
                  return (
                    <option key={code} value={code} disabled={desabilitado}>
                      {t.bandeira_emoji} {t.nome_pt}
                      {desabilitado ? ` (em ${LABELS[usadoEm]})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (!validar()) return;
          setConfirmOpen(true);
        }}
        disabled={saving}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        {saving ? "Calculando…" : "Salvar e calcular pontos do Top 4"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar encerramento"
        description={`Isso vai recalcular pontos de ${countPalpites ?? "—"} palpites Top 4. O ranking vai mudar imediatamente. Confirmar?`}
        confirmLabel="Sim, calcular"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          salvar();
        }}
      />
    </div>
  );
}
