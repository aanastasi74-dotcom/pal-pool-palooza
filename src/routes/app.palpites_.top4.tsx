import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { times } from "@/lib/mock-data";
import { Sparkles, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyTop4, useUpdateTop4, useFaseAtual } from "@/lib/queries/top4";
import { useSetting } from "@/lib/queries/settings";
import { getRegraDaFase, TOP4_REGRA_DEFAULT, type Top4Regra } from "@/lib/top4-rules";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/palpites_/top4")({
  head: () => ({ meta: [{ title: "Top 4 — Bolão dos Perebas" }] }),
  component: Top4Page,
});

const candidatos = ["BRA", "ARG", "FRA", "ESP", "ALE", "ING", "POR", "HOL", "URU"];

function bannerCls(fase: string, bloqueada: boolean) {
  if (bloqueada) return "border-muted-foreground/40 bg-muted text-muted-foreground";
  if (fase === "antes_copa") return "border-success/40 bg-success/10 text-success";
  if (fase === "grupos") return "border-accent/40 bg-gold text-gold-foreground";
  if (fase === "round_32") return "border-orange-500/40 bg-orange-500/10 text-orange-700";
  return "border-border bg-card";
}

function Top4Page() {
  const { data: quotas = [], isLoading: loadingQ } = useMinhasQuotas();
  const quota = (quotas as any[])[0];
  const { data: faseAtual = "antes_copa", isLoading: loadingF } = useFaseAtual();
  const { data: top4Windows } = useSetting<Top4Regra[]>("top4_windows");
  const { data: top4, isLoading: loadingT } = useMyTop4(quota?.id);
  const update = useUpdateTop4();

  const regras = (top4Windows && Array.isArray(top4Windows) && top4Windows.length ? top4Windows : TOP4_REGRA_DEFAULT) as Top4Regra[];
  const regra = getRegraDaFase(faseAtual, regras);
  const bloqueada = regra.bloqueada;

  const [picks, setPicks] = useState<string[]>(["", "", "", ""]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (top4) {
      setPicks([top4.posicao_1 ?? "", top4.posicao_2 ?? "", top4.posicao_3 ?? "", top4.posicao_4 ?? ""]);
    }
  }, [top4]);

  if (loadingQ || loadingF || loadingT) return <Skeleton className="h-96 w-full" />;
  if (!quota) {
    return <EmptyState icon={Sparkles} title="Sem quota ativa" description="Compra uma quota pra palpitar no Top 4." />;
  }

  const setPos = (i: number, v: string) => {
    if (bloqueada) return;
    const idxAntigo = picks.indexOf(v);
    const next = [...picks];
    if (idxAntigo !== -1 && idxAntigo !== i) {
      next[idxAntigo] = picks[i];
      next[i] = v;
      toast.info(`Trocado com a ${idxAntigo + 1}ª posição.`);
    } else {
      next[i] = v;
    }
    setPicks(next);
  };

  const salvar = () => {
    const unicos = new Set(picks.filter(Boolean));
    if (picks.some((p) => !p)) {
      toast.error("Preenche os 4 times do Top 4.");
      return;
    }
    if (unicos.size !== 4) {
      toast.error("Cada time só pode aparecer uma vez no Top 4");
      return;
    }
    update.mutate(
      { quota_id: quota.id, posicao_1: picks[0], posicao_2: picks[1], posicao_3: picks[2], posicao_4: picks[3] },
      {
        onSuccess: () => toast.success("Top 4 salvo. Boa sorte, perebada!"),
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
      },
    );
  };

  const handleClickSalvar = () => {
    if (faseAtual === "antes_copa") {
      salvar();
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Top 4 da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quem leva a taça e quem fica no quase. Vale até 4.000 pts.</p>
      </div>

      <section className={`rounded-2xl border p-4 shadow-card ${bannerCls(faseAtual, bloqueada)}`}>
        <div className="flex items-start gap-3">
          {bloqueada ? <Lock className="mt-1 h-5 w-5" /> : <Sparkles className="mt-1 h-5 w-5" />}
          <div>
            <p className="font-display font-bold">Estamos em: {regra.label}</p>
            <p className="text-xs">
              Eficácia agora: <span className="font-bold">{regra.eficacia}%</span> · potencial máximo <span className="font-bold">{regra.max_pontos.toLocaleString("pt-BR")} pts</span>
            </p>
          </div>
        </div>
      </section>

      {bloqueada && (
        <div className="flex items-center gap-2 rounded-2xl border border-muted-foreground/30 bg-muted/40 px-4 py-3 text-sm">
          <Lock className="h-4 w-4" /> A janela do Top 4 já fechou. Seu palpite atual permanece como registrado.
        </div>
      )}

      {!bloqueada && faseAtual !== "antes_copa" && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Mudar agora reduz o potencial para {regra.max_pontos.toLocaleString("pt-BR")} pts (eficácia {regra.eficacia}%).
        </div>
      )}

      <div className="space-y-3">
        {picks.map((pick, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-gold-foreground">
              {i + 1}º
            </div>
            <span className="text-3xl">{times[pick]?.bandeira ?? "🏳️"}</span>
            <select
              value={pick}
              disabled={bloqueada}
              onChange={(e) => setPos(i, e.target.value)}
              className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            >
              <option value="">— escolher —</option>
              {candidatos.map((c) => {
                const usadoEm = picks.indexOf(c);
                const desabilitado = usadoEm !== -1 && usadoEm !== i;
                return (
                  <option key={c} value={c} disabled={desabilitado}>
                    {times[c]?.nome ?? c}{desabilitado ? ` (na ${usadoEm + 1}ª)` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>

      {!bloqueada && (
        <button
          onClick={handleClickSalvar}
          disabled={update.isPending}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {update.isPending ? "Salvando…" : "Salvar palpite Top 4"}
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tem certeza?"
        description={`Você está alterando seu palpite Top 4 durante ${regra.label}. Isso reduz o potencial máximo para ${regra.max_pontos.toLocaleString("pt-BR")} pts (eficácia ${regra.eficacia}%). Tem certeza que quer mudar?`}
        confirmLabel="Sim, alterar"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          salvar();
        }}
      />
    </div>
  );
}
