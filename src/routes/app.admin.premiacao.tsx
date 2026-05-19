import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { PremiacaoCard } from "@/components/premiacao-card";
import { usePremiacao } from "@/lib/queries/premiacao";
import { useRanking } from "@/lib/queries/profiles";
import { CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { isElegivelLanterna, razaoNaoElegivel, REGRA_LANTERNINHA, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/admin/premiacao")({
  head: () => ({ meta: [{ title: "Admin — Premiação" }] }),
  component: PremiacaoAdmin,
});

function PremiacaoAdmin() {
  const { data } = usePremiacao();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Premiação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Valores calculados automaticamente a partir das quotas ativas, conforme regulamento §10.
        </p>
      </div>

      {data?.faixa && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-bold">Faixa ativa: {data.faixa.nome} ({data.faixa.rotulo} quotas)</span> —
            definida automaticamente pelo nº de quotas ativas ({data.quotas_ativas}), conforme regulamento §10.
            Para ajustes manuais, edite a tabela <code className="rounded bg-secondary px-1">faixas_premiacao</code> no SQL Editor.
          </p>
        </div>
      )}

      <PremiacaoCard showInviteCta={false} />

      <PainelLanterna />
    </div>
  );
}

function PainelLanterna() {
  const { data: ranking } = useRanking();
  const list: { id: string; nome: string; pontos: number; palpites_validos: number; palpites_possiveis: number }[] = (ranking ?? []).map((q: any) => ({
    id: q.id,
    nome: q.profile?.nome ?? "—",
    pontos: q.pontos ?? 0,
    palpites_validos: q.palpites_validos ?? 0,
    palpites_possiveis: q.palpites_possiveis ?? 0,
  }));
  const ordenado = [...list].sort((a, b) => a.pontos - b.pontos);
  const ultimo = ordenado[0];
  const primeiroElegivel = ordenado.find((p) => isElegivelLanterna(p));
  const elegiveis = list.filter((p) => isElegivelLanterna(p)).length;
  const naoElegiveis = list.length - elegiveis;
  const lanternaCoincide = ultimo && primeiroElegivel && ultimo.id === primeiroElegivel.id;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 rotate-180 text-accent-foreground" />
        <h3 className="font-display font-bold">Regra do lanterninha · 5%</h3>
      </div>
      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{REGRA_LANTERNINHA}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-success/10 p-3">
          <p className="font-display text-2xl font-bold text-success">{elegiveis}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quotas elegíveis</p>
        </div>
        <div className="rounded-xl bg-accent/20 p-3">
          <p className="font-display text-2xl font-bold text-accent-foreground">{naoElegiveis}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quotas não elegíveis</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-left">
            <tr><th className="px-3 py-2">Cenário</th><th className="px-3 py-2">Participante</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-3 py-2 font-semibold">Último colocado</td>
              <td className="px-3 py-2">{ultimo?.nome ?? "—"}</td>
              <td className="px-3 py-2">
                {ultimo && isElegivelLanterna(ultimo) ? (
                  <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Elegível</span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {ultimo ? razaoNaoElegivel(ultimo) : "—"}</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-semibold">Lanterninha elegível</td>
              <td className="px-3 py-2">{primeiroElegivel?.nome ?? "Ninguém"}</td>
              <td className="px-3 py-2">
                {primeiroElegivel ? (
                  <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {primeiroElegivel.pontos} pts · {primeiroElegivel.palpites_validos}/{primeiroElegivel.palpites_possiveis}</span>
                ) : (
                  <span className="text-muted-foreground">Redistribui 67/27/11 entre o pódio</span>
                )}
              </td>
            </tr>
            {!lanternaCoincide && primeiroElegivel && (
              <tr className="bg-accent/10">
                <td className="px-3 py-2 font-semibold">Diferença</td>
                <td className="px-3 py-2 text-muted-foreground">Lanterninha real ≠ elegível</td>
                <td className="px-3 py-2 text-muted-foreground">Prêmio sobe pra {primeiroElegivel.nome}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">Critérios mínimos: {ENGAJAMENTO_MIN * 100}% de palpites válidos e {PONTOS_MIN} pontos.</p>
    </div>
  );
}
