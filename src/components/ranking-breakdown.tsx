import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Breakdown = {
  jec: number;
  pex: number;
  rdf: number;
  rgm: number;
  rgv: number;
  res: number;
  jzr: number;
  npt: number;
  aproveitamento_pct?: number | null;
  jogos_pontuados?: number;
  jogos_disputados?: number;
};

type BadgeDef = {
  key: keyof Breakdown;
  label: string;
  title: string;
  desc: string;
  cls: string;
};

const BADGES: BadgeDef[] = [
  {
    key: "jec",
    label: "JEC",
    title: "Jogos Encerrados",
    desc: "Total de jogos já encerrados. Igual pra todas as quotas. Vale como referência: JEC = PEX + RDF + RGM + RGV + RES + JZR + NPT.",
    cls: "bg-muted text-muted-foreground border-border",
  },
  {
    key: "pex",
    label: "PEX",
    title: "Placar Exato",
    desc: "Você acertou o placar exato (ex.: previu 2×1 e deu 2×1). Vale 12 pontos × peso do jogo.",
    cls: "bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/50",
  },
  {
    key: "rdf",
    label: "RDF",
    title: "Resultado + Diferença",
    desc: "Acertou o vencedor e a diferença de gols, mas não o placar exato (ex.: previu 2×1, deu 3×2). Vale 6 pontos × peso.",
    cls: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50",
  },
  {
    key: "rgm",
    label: "RGM",
    title: "Resultado + Gols do Mandante",
    desc: "Acertou o vencedor e o número de gols do time da casa (ex.: previu 2×1, deu 2×0). Vale 5 pontos × peso.",
    cls: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50",
  },
  {
    key: "rgv",
    label: "RGV",
    title: "Resultado + Gols do Visitante",
    desc: "Acertou o vencedor e o número de gols do time visitante (ex.: previu 2×1, deu 3×1). Vale 5 pontos × peso.",
    cls: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50",
  },
  {
    key: "res",
    label: "RES",
    title: "Só Resultado",
    desc: "Acertou só o vencedor (ou o empate), sem nenhum critério secundário (ex.: previu 2×1, deu 4×0). Vale 4 pontos × peso.",
    cls: "bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/50",
  },
  {
    key: "jzr",
    label: "JZR",
    title: "Jogo Zerado",
    desc: "Errou o resultado (palpitou em time errado ou empate quando não foi). Zero pontos no jogo.",
    cls: "bg-destructive/20 text-destructive border-destructive/50",
  },
  {
    key: "npt",
    label: "NPT",
    title: "Não Palpitou",
    desc: "Não enviou palpite antes do jogo travar. Zero pontos.",
    cls: "bg-zinc-600/20 text-zinc-700 dark:text-zinc-400 border-zinc-600/50",
  },
];

export function RankingBreakdown({
  b,
  pot,
}: {
  b: Breakdown;
  pot?: { valor: number; clickable: boolean; onClick?: () => void } | null;
}) {
  const potCls =
    pot == null
      ? ""
      : pot.valor >= 2000
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/40"
        : pot.valor >= 1000
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300/60 dark:border-amber-500/40"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-300/60 dark:border-rose-500/40";

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {BADGES.map((bd) => (
        <Popover key={bd.key}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition hover:opacity-80 ${bd.cls}`}
              title={`${bd.label} — ${bd.title}`}
            >
              <span>{bd.label}</span>
              <span className="font-bold tabular-nums">{b[bd.key] ?? 0}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 text-xs">
            <p className="font-display text-sm font-bold">{bd.label} — {bd.title}</p>
            <p className="mt-1 text-muted-foreground">{bd.desc}</p>
          </PopoverContent>
        </Popover>
      ))}
      {b.aproveitamento_pct !== null && b.aproveitamento_pct !== undefined && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition hover:opacity-80 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/40"
              title="APROV — Aproveitamento"
            >
              <span>APROV</span>
              <span className="font-bold tabular-nums">{b.aproveitamento_pct}%</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 text-xs">
            <p className="font-display text-sm font-bold">APROV — Aproveitamento</p>
            <p className="mt-1 text-muted-foreground">
              Aproveitamento = jogos pontuados ÷ jogos disputados.
              {b.jogos_pontuados !== undefined && b.jogos_disputados !== undefined
                ? ` Quota pontuou em ${b.jogos_pontuados} de ${b.jogos_disputados} jogos.`
                : ""}
            </p>
          </PopoverContent>
        </Popover>
      )}
      {pot != null && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={pot.clickable ? pot.onClick : undefined}
              role={pot.clickable ? "button" : undefined}
              aria-disabled={!pot.clickable}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${potCls} ${pot.clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              title="POT — Potencial máximo do Top 4"
            >
              <span>POT</span>
              <span className="font-bold tabular-nums">{pot.valor.toLocaleString("pt-BR")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 text-xs">
            <p className="font-display text-sm font-bold">POT — Potencial do Top 4</p>
            <p className="mt-1 text-muted-foreground">
              Potencial máximo do Top 4 considerando o chaveamento atual do mata-mata. Atualiza após cada jogo encerrar.
              {pot.clickable ? " Toque pra ver os 4 times palpitados." : ""}
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

