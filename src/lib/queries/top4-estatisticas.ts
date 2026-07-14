import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { estadoDoTime, type EstadoTime } from "@/lib/top4-status";

export type TeamStat = {
  team_id: string;
  bracket_position: string;
  nome_pt: string;
  bandeira_emoji: string | null;
  estado: EstadoTime | null;
  votos: number;
  percentual: number;
};

export type Top4Estatisticas = {
  base_quotas: number;
  qualquer_posicao: TeamStat[];
  campeao: TeamStat[];
  vice: TeamStat[];
  terceiro: TeamStat[];
  quarto: TeamStat[];
  liberado: boolean;
  libera_em: string | null;
};

export function useTop4Estatisticas() {
  return useQuery({
    queryKey: ["top4-estatisticas"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Top4Estatisticas> => {
      const { data: settingRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "top4_publico_a_partir_de")
        .maybeSingle();

      const libera_em = (settingRow?.value as string) ?? null;
      const liberado = libera_em ? new Date(libera_em) <= new Date() : false;

      const empty: Top4Estatisticas = {
        base_quotas: 0,
        qualquer_posicao: [],
        campeao: [],
        vice: [],
        terceiro: [],
        quarto: [],
        liberado,
        libera_em,
      };
      if (!liberado) return empty;

      const { data: quotas, error: qErr } = await supabase
        .from("quotas")
        .select("id")
        .eq("status", "ativa")
        .not("paga_em", "is", null);
      if (qErr) throw qErr;
      const quotaIds = (quotas ?? []).map((q) => q.id);
      const base = quotaIds.length;
      if (base === 0) return { ...empty, liberado: true };

      const [predsRes, teamsRes, matchesRes] = await Promise.all([
        supabase
          .from("top4_predictions")
          .select("quota_id, posicao_1, posicao_2, posicao_3, posicao_4")
          .in("quota_id", quotaIds),
        supabase.from("teams").select("id, bracket_position, nome_pt, bandeira_emoji"),
        supabase
          .from("matches")
          .select(
            "numero_jogo,status,team_home_id,team_away_id,placar_casa,placar_fora,placar_casa_prorrogacao,placar_fora_prorrogacao,penaltis_casa,penaltis_fora",
          ),
      ]);
      if (predsRes.error) throw predsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      const preds = predsRes.data ?? [];
      const teams = teamsRes.data ?? [];
      const matches = matchesRes.data ?? [];

      const teamByBP = new Map<string, (typeof teams)[number]>();
      teams.forEach((t: any) => {
        if (t.bracket_position) teamByBP.set(t.bracket_position, t);
      });

      const estadoByTeamId = new Map<string, EstadoTime | null>();
      teams.forEach((t: any) => {
        estadoByTeamId.set(t.id, estadoDoTime(t.id, matches as any));
      });

      const build = (contagem: Map<string, number>): TeamStat[] =>
        Array.from(contagem.entries())
          .map(([bp, votos]) => {
            const t = teamByBP.get(bp) as any;
            if (!t) return null;
            return {
              team_id: t.id,
              bracket_position: bp,
              nome_pt: t.nome_pt ?? bp,
              bandeira_emoji: t.bandeira_emoji ?? null,
              estado: estadoByTeamId.get(t.id) ?? null,
              votos,
              percentual: Math.round((votos / base) * 1000) / 10,
            } as TeamStat;
          })
          .filter((x): x is TeamStat => x !== null)
          .sort((a, b) => b.votos - a.votos || a.nome_pt.localeCompare(b.nome_pt));

      const contarPorPosicao = (col: "posicao_1" | "posicao_2" | "posicao_3" | "posicao_4"): TeamStat[] => {
        const contagem = new Map<string, number>();
        preds.forEach((p: any) => {
          const bp = p[col];
          if (bp) contagem.set(bp, (contagem.get(bp) ?? 0) + 1);
        });
        return build(contagem);
      };

      const qualquerPos = (): TeamStat[] => {
        const contagem = new Map<string, number>();
        preds.forEach((p: any) => {
          [p.posicao_1, p.posicao_2, p.posicao_3, p.posicao_4].forEach((bp: string | null) => {
            if (bp) contagem.set(bp, (contagem.get(bp) ?? 0) + 1);
          });
        });
        return build(contagem);
      };

      return {
        base_quotas: base,
        qualquer_posicao: qualquerPos(),
        campeao: contarPorPosicao("posicao_1"),
        vice: contarPorPosicao("posicao_2"),
        terceiro: contarPorPosicao("posicao_3"),
        quarto: contarPorPosicao("posicao_4"),
        liberado: true,
        libera_em,
      };
    },
  });
}
