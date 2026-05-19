import { BarChart3, Sparkles, Target } from "lucide-react";
import { useEstatisticasPalpites, useSoVoceAchouMulti } from "@/lib/queries/estatisticas-palpites";

type Props = {
  match_id: string;
  travado_em?: string | null;
  /** quotas do usuário logado para checar "só você achou" */
  minhas_quotas_ids?: string[];
};

function Barra({ label, pct, cor }: { label: string; pct: number; cor: string }) {
  const v = Number.isFinite(pct) ? pct : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={`absolute inset-y-0 left-0 ${cor}`}
          style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
        />
      </div>
      <span className="w-12 text-right font-display font-bold">{v.toFixed(0)}%</span>
    </div>
  );
}

export function EstatisticasPalpites({ match_id, travado_em, minhas_quotas_ids = [] }: Props) {
  const jogoTravado = travado_em === undefined ? true : !!travado_em && new Date(travado_em).getTime() <= Date.now();
  const { data, isLoading } = useEstatisticasPalpites(match_id, jogoTravado);
  const soVoceResults = useSoVoceAchouMulti(match_id, minhas_quotas_ids, jogoTravado);

  if (!jogoTravado) return null;
  if (isLoading || !data) return null;
  if (data.disponivel === false) return null;

  const soVoceHits = soVoceResults
    .map((r) => r.data)
    .filter((d): d is NonNullable<typeof d> => !!d && d.aplicavel);

  // Quórum não atingido
  if (!data.quorum_atingido) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Aguardando mais palpites ({data.total_palpites ?? 0} de 10) pra mostrar estatísticas detalhadas.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Estatísticas dos palpites
        </p>
        <span className="text-[10px] text-muted-foreground">{data.total_palpites} palpites</span>
      </div>

      {data.placar_mais_apostado && (
        <div className="rounded-xl bg-card p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Placar mais apostado</p>
          <p className="mt-1 font-display text-xl font-black">
            {data.placar_mais_apostado.casa} <span className="text-muted-foreground">×</span>{" "}
            {data.placar_mais_apostado.fora}{" "}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">
              ({data.placar_mais_apostado.qtd} perebas)
            </span>
          </p>
        </div>
      )}

      {data.percentuais && (
        <div className="space-y-1.5">
          <Barra label="Vitória mandante" pct={data.percentuais.vitoria_casa} cor="bg-primary" />
          <Barra label="Empate" pct={data.percentuais.empate} cor="bg-muted-foreground/60" />
          <Barra label="Vitória visitante" pct={data.percentuais.vitoria_fora} cor="bg-accent" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.maior_diferenca && data.maior_diferenca.apelido && (
          <div className="rounded-xl bg-card p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Maior diferença</p>
            <p className="mt-1 font-display text-base font-black">
              {data.maior_diferenca.casa} × {data.maior_diferenca.fora}
            </p>
            <p className="text-[11px] text-muted-foreground">
              por <span className="font-semibold text-foreground">{data.maior_diferenca.apelido}</span> (quota #
              {data.maior_diferenca.quota_numero})
            </p>
          </div>
        )}
        {data.palpite_do_louco && data.palpite_do_louco.apelido && (
          <div className="rounded-xl bg-card p-3">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Palpite do louco
            </p>
            <p className="mt-1 font-display text-base font-black">
              {data.palpite_do_louco.casa} × {data.palpite_do_louco.fora}
            </p>
            <p className="text-[11px] text-muted-foreground">
              por <span className="font-semibold text-foreground">{data.palpite_do_louco.apelido}</span> (quota #
              {data.palpite_do_louco.quota_numero})
            </p>
          </div>
        )}
      </div>

      {soVoceHits.length > 0 && (
        <div className="space-y-1.5">
          {soVoceHits.map((h) => (
            <div
              key={h.quota_id}
              className="flex items-center gap-2 rounded-xl bg-gold/20 px-3 py-2 text-xs font-bold text-gold-foreground"
            >
              <Target className="h-4 w-4" />
              <span>
                SÓ VOCÊ ACHOU {h.palpite_casa}×{h.palpite_fora} nesta quota
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
