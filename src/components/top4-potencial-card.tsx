import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/lib/queries/teams";
import { calcularPotencialMaximo, mensagemPorPotencial, type Top4Picks } from "@/lib/top4-potencial/engine";

type Props = {
  picks: Top4Picks;
  pesoPercentual: number;
  potencialInicial?: number | null;
  pontosCalculados?: number;
};

export function Top4PotencialCard({ picks, pesoPercentual, potencialInicial, pontosCalculados }: Props) {
  const { data: teams = [] } = useTeams();
  const { data: matches = [] } = useQuery({
    queryKey: ["matches", "top4-potencial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("numero_jogo,team_home_id,team_away_id,home_origem,away_origem,status,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora")
        .order("numero_jogo", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const resultado = useMemo(
    () => calcularPotencialMaximo(picks, matches as any, teams as any, pesoPercentual),
    [picks, matches, teams, pesoPercentual],
  );

  if (!resultado.faseGruposCompleta) return null;

  const atual = resultado.pontos;
  const max = 4000;
  const fator = pesoPercentual / 100;
  const max4Reais = Math.floor(max * fator);
  const temInicial = potencialInicial != null && potencialInicial > 0;
  const delta = temInicial ? atual - (potencialInicial as number) : 0;

  const fmt = (n: number) => n.toLocaleString("pt-BR");

  const variacaoCls =
    delta < 0
      ? "text-destructive"
      : delta > 0
        ? "text-success"
        : "text-muted-foreground";

  const variacaoTxt = temInicial
    ? delta === 0
      ? "Tudo certo até agora, pereba — bracket favorável."
      : delta < 0
        ? `Caiu ${fmt(Math.abs(delta))} pts desde o início — o chaveamento massacrou seu Top 4.`
        : `Subiu ${fmt(delta)} pts desde o início — o bracket virou a teu favor.`
    : "";

  return (
    <div className="space-y-3">
      {pontosCalculados !== undefined && (
        <section className="rounded-2xl border border-success/40 bg-success/5 p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-success/20 text-lg">
              ⭐
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-success">
                Pontuação Top 4 já conquistada
              </p>
              <p className="mt-0.5 font-display text-2xl font-extrabold text-success">
                {fmt(pontosCalculados)} pts
                {pontosCalculados === 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (aguardando quartas)
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-card">
        <div className="flex items-start gap-3">
          <Trophy className="mt-1 h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-primary">
              Potencial máximo do Top 4
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Considerando o chaveamento atual do mata-mata, o melhor cenário pra você é:
            </p>

            {temInicial ? (
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Inicial (fim dos grupos)</span>
                  <span className="font-display font-bold">{fmt(potencialInicial as number)} pts</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-primary">Atual</span>
                  <span className="font-display text-lg font-extrabold">🏆 {fmt(atual)} pts</span>
                </div>
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${delta < 0 ? "bg-destructive/10" : delta > 0 ? "bg-success/10" : "bg-muted/40"}`}>
                  <span className={`text-xs uppercase tracking-wide ${variacaoCls}`}>Variação</span>
                  <span className={`flex items-center gap-1 font-display font-bold ${variacaoCls}`}>
                    {delta < 0 ? <TrendingDown className="h-4 w-4" /> : delta > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    {delta > 0 ? "+" : ""}{fmt(delta)} pts
                  </span>
                </div>
                <p className={`pt-1 text-xs font-semibold ${variacaoCls}`}>{variacaoTxt}</p>
              </div>
            ) : (
              <>
                <p className="mt-3 font-display text-2xl font-extrabold">
                  🏆 {fmt(atual)} pts
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (de {fmt(max4Reais)} — eficácia {pesoPercentual}%)
                  </span>
                </p>
                <p className="mt-2 text-sm font-semibold">{mensagemPorPotencial(atual)}</p>
              </>
            )}

            <p className="mt-2 text-[11px] text-muted-foreground">
              Atualiza automaticamente quando jogos do mata-mata forem encerrados.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
