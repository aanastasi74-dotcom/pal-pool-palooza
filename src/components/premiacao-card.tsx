import { Link } from "@tanstack/react-router";
import { Trophy, Medal, Award, Users, Sparkles, Lightbulb, Wallet, Crown } from "lucide-react";
import { usePremiacao, fmtBRL } from "@/lib/queries/premiacao";
import { usePremiados, CATEGORIA_META, CATEGORIAS_ORDER } from "@/lib/queries/premiados";
import { useSetting } from "@/lib/queries/settings";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { showInviteCta?: boolean };

export function PremiacaoCard({ showInviteCta = true }: Props) {
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data, isLoading } = usePremiacao();
  const { data: premiados = [], isLoading: loadingPremiados } = usePremiados();

  if (copaEncerrada) {
    if (loadingPremiados) return <Skeleton className="h-72 w-full rounded-3xl" />;
    const total = premiados.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    return (
      <div className="rounded-3xl border border-accent bg-card p-5 shadow-card md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Prêmio oficial · Copa encerrada</h2>
          </div>
          <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            Final
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Total distribuído: {fmtBRL(total)}</p>

        <ul className="mt-4 divide-y divide-border">
          {CATEGORIAS_ORDER.map((cat) => {
            const p = premiados.find((x) => x.categoria === cat);
            const meta = CATEGORIA_META[cat];
            if (!p) return null;
            return (
              <li key={cat} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">{meta.emoji}</span>
                  <div className="leading-tight">
                    <p className="font-semibold">{p.apelido} <span className="text-xs text-muted-foreground">#{p.numero_quota}</span></p>
                    <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                  </div>
                </div>
                <p className="font-display font-bold">{fmtBRL(Number(p.valor_total))}</p>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full rounded-3xl" />;
  }

  const { premios, faixa, proxima_faixa } = data;
  const showQuarto = premios.quarto > 0;
  const showQuinto = premios.quinto > 0;
  const showSextoDecimo = premios.sexto_decimo_cada > 0;
  const showDevolucao = premios.devolucao_total > 0;
  const showBonus = premios.primeiro_bonus > 0;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Prêmio confirmado</h2>
        </div>
        {faixa && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Faixa {faixa.nome} · {faixa.rotulo}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {data.quotas_ativas} quota{data.quotas_ativas === 1 ? "" : "s"} ativa{data.quotas_ativas === 1 ? "" : "s"} ·
        bolo bruto {fmtBRL(data.bruta)}
      </p>

      <ul className="mt-4 divide-y divide-border">
        <PremioLinha
          icon={<Trophy className="h-4 w-4 text-gold" />}
          label="1º colocado"
          valor={premios.primeiro_total}
          sublabel={showBonus ? `base ${fmtBRL(premios.primeiro_base)} + bônus ${fmtBRL(premios.primeiro_bonus)}` : undefined}
          highlight
        />
        <PremioLinha icon={<Medal className="h-4 w-4 text-muted-foreground" />} label="2º colocado" valor={premios.segundo} />
        <PremioLinha icon={<Award className="h-4 w-4 text-accent-foreground" />} label="3º colocado" valor={premios.terceiro} />
        {showQuarto && <PremioLinha label="4º colocado" valor={premios.quarto} />}
        {showQuinto && <PremioLinha label="5º colocado" valor={premios.quinto} />}
        {showSextoDecimo && (
          <PremioLinha
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            label="6º–10º (cada)"
            valor={premios.sexto_decimo_cada}
            sublabel={`total ${fmtBRL(premios.sexto_decimo_total)}`}
          />
        )}
        {showDevolucao && (
          <PremioLinha
            label={`Devolução · P${premios.devolucao_pos_de}–P${
              (premios.devolucao_pos_de ?? 0) + premios.devolucao_qts - 1
            }`}
            valor={premios.devolucao_por_pereba}
            sublabel={`R$ ${premios.devolucao_por_pereba.toFixed(0)} pra cada um · ${premios.devolucao_qts} perebas`}
          />
        )}
        <PremioLinha
          icon={<Lightbulb className="h-4 w-4 rotate-180 text-muted-foreground" />}
          label="Lanterninha"
          valor={premios.lanterninha}
        />
      </ul>

      {showInviteCta && proxima_faixa && (
        <Link
          to="/app/premio"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm transition hover:bg-primary/10"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="leading-tight">
            <p className="font-bold">
              Faltam {proxima_faixa.quotas_para_alcancar} quota{proxima_faixa.quotas_para_alcancar === 1 ? "" : "s"} pra próxima faixa ({proxima_faixa.nome})
            </p>
            <p className="text-xs text-muted-foreground">Chama os perebas — quanto mais gente, maior o bolo.</p>
          </div>
        </Link>
      )}
    </div>
  );
}

function PremioLinha({
  icon,
  label,
  valor,
  sublabel,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  valor: number;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between py-2.5 text-sm">
      <div className="flex items-center gap-2">
        {icon ?? <span className="inline-block h-4 w-4" />}
        <div className="leading-tight">
          <p className={highlight ? "font-display font-bold" : "font-semibold"}>{label}</p>
          {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
      <p className={highlight ? "font-display text-base font-extrabold" : "font-display font-bold"}>
        {fmtBRL(valor)}
      </p>
    </li>
  );
}
