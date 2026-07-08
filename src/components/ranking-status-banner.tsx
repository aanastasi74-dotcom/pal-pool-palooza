import { Crown, Loader2 } from "lucide-react";
import { useSetting } from "@/lib/queries/settings";
import { usePremiados, CATEGORIA_META } from "@/lib/queries/premiados";
import { fmtBRL } from "@/lib/queries/premiacao";

export function RankingStatusBanner() {
  const { data: emApuracao } = useSetting<boolean>("ranking_em_apuracao");
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: premiados = [] } = usePremiados();

  if (copaEncerrada) {
    const campeao = premiados.find((p) => p.categoria === "primeiro");
    const vice = premiados.find((p) => p.categoria === "segundo");
    const terceiro = premiados.find((p) => p.categoria === "terceiro");
    if (!campeao) return null;
    return (
      <div className="overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-8">
        <p className="text-xs uppercase tracking-widest opacity-80">🏆 Copa encerrada — ranking oficial</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Crown className="h-12 w-12 text-accent" />
          <div>
            <p className="font-display text-3xl font-black md:text-4xl">{campeao.apelido}</p>
            <p className="text-sm opacity-90">
              Campeão da perebada · quota #{campeao.numero_quota} · levou {fmtBRL(campeao.valor_total)}
            </p>
          </div>
        </div>
        {(vice || terceiro) && (
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            {vice && (
              <p>
                {CATEGORIA_META.segundo.emoji} <b>{vice.apelido}</b> · {fmtBRL(vice.valor_total)}
              </p>
            )}
            {terceiro && (
              <p>
                {CATEGORIA_META.terceiro.emoji} <b>{terceiro.apelido}</b> · {fmtBRL(terceiro.valor_total)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (emApuracao) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />
        <div>
          <p className="font-display font-bold">Apuração oficial em andamento</p>
          <p className="text-muted-foreground">
            O admin está fechando o ranking. Pode haver pequenos ajustes nos próximos minutos.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
