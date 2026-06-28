import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/lib/queries/teams";
import { calcularPotencialMaximo, type Top4Picks } from "@/lib/top4-potencial/engine";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  picksAntigos: Top4Picks;
  picksNovos: Top4Picks;
  pesoAtual: number;
  pesoNovo: number;
  onConfirm: () => void;
};

export function Top4ConfirmMudancaDialog({
  open,
  onOpenChange,
  picksAntigos,
  picksNovos,
  pesoAtual,
  pesoNovo,
  onConfirm,
}: Props) {
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

  const teamByBp = useMemo(
    () => new Map((teams as any[]).map((t) => [t.bracket_position, t])),
    [teams],
  );

  const antes = useMemo(
    () => calcularPotencialMaximo(picksAntigos, matches as any, teams as any, pesoAtual),
    [picksAntigos, matches, teams, pesoAtual],
  );
  const depois = useMemo(
    () => calcularPotencialMaximo(picksNovos, matches as any, teams as any, pesoNovo),
    [picksNovos, matches, teams, pesoNovo],
  );

  const delta = depois.pontos - antes.pontos;
  const faseCompleta = antes.faseGruposCompleta;

  const linha = (bp: string, emoji: string) => {
    const t = teamByBp.get(bp) as any;
    return (
      <li className="flex items-center gap-1.5 text-sm">
        <span>{emoji}</span>
        <span className="text-base">{t?.bandeira_emoji ?? "🏳️"}</span>
        <span className="truncate">{t?.nome_pt ?? "—"}</span>
      </li>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Confirmar mudança do Top 4</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a alterar suas escolhas. Isso pode reduzir a eficácia da sua pontuação.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Antes</p>
            <ul className="space-y-1">
              {linha(picksAntigos.campeao, "🥇")}
              {linha(picksAntigos.vice, "🥈")}
              {linha(picksAntigos.terceiro, "🥉")}
              {linha(picksAntigos.quarto, "🏅")}
            </ul>
            <p className="mt-3 text-xs">Eficácia: <strong>{pesoAtual}%</strong></p>
            {faseCompleta && (
              <p className="text-xs">Potencial: <strong>{antes.pontos.toLocaleString("pt-BR")}</strong></p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Depois</p>
            <ul className="space-y-1">
              {linha(picksNovos.campeao, "🥇")}
              {linha(picksNovos.vice, "🥈")}
              {linha(picksNovos.terceiro, "🥉")}
              {linha(picksNovos.quarto, "🏅")}
            </ul>
            <p className="mt-3 text-xs">Eficácia: <strong>{pesoNovo}%</strong></p>
            {faseCompleta && (
              <p className="text-xs">Potencial: <strong>{depois.pontos.toLocaleString("pt-BR")}</strong></p>
            )}
          </div>
        </div>

        {faseCompleta ? (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              delta < 0
                ? "bg-destructive/10 text-destructive"
                : delta > 0
                  ? "bg-success/10 text-success"
                  : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {delta < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {delta === 0
              ? "Sem variação no potencial."
              : `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR")} pts no potencial máximo`}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Quando o mata-mata começar, você poderá ver o impacto exato no potencial.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar mudança</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
