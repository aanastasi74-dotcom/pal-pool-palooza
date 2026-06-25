import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Minus, Trophy, Info, Users, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRanking } from "@/lib/queries/profiles";
import { useRankingDiario } from "@/lib/queries/public-profile";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RankingBreakdown } from "@/components/ranking-breakdown";
import { HistoricoRankingDialog } from "@/components/historico-ranking-dialog";

export const Route = createFileRoute("/app/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Bolão dos Perebas" }] }),
  component: Ranking,
});

type Row = {
  id: string;
  user_id: string;
  pontos: number;
  numero: number;
  posicao?: number | null;
  variacao?: number | null;
  jec?: number;
  pex?: number;
  rdf?: number;
  rgm?: number;
  rgv?: number;
  res?: number;
  jzr?: number;
  npt?: number;
  aproveitamento_pct?: number | null;
  profile?: { nome?: string; apelido?: string; cor?: string; sigla?: string | null } | null;
};

function VariacaoRanking({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return null;
  if (v > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-success" title="variação desde o último jogo encerrado">
      <ArrowUp className="h-3 w-3" />+{v}
    </span>
  );
  if (v < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-destructive" title="variação desde o último jogo encerrado">
      <ArrowDown className="h-3 w-3" />{v}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground" title="variação desde o último jogo encerrado">
      <Minus className="h-3 w-3" />
    </span>
  );
}

type Tab = "geral" | "diario";

function Ranking() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("geral");
  const [busca, setBusca] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const geral = useRanking();
  const diario = useRankingDiario();
  const active = tab === "geral" ? geral : diario;
  const isLoading = active.isLoading;

  const rows = (active.data ?? []) as Row[];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const lista = rows.filter((p) => {
    const q = busca.toLowerCase();
    if (!q) return true;
    return (p.profile?.apelido ?? "").toLowerCase().includes(q) || (p.profile?.nome ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Ranking da perebada</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Atualizado em tempo real após cada partida
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5" /></TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Critérios de desempate:</p>
                  <ol className="mt-1 list-decimal pl-4 text-xs">
                    <li>Mais placares exatos</li>
                    <li>Mais resultados certos</li>
                    <li>Ordem alfabética</li>
                  </ol>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pereba…"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm shadow-card"
        />
      </div>
      <p className="text-xs text-muted-foreground">{lista.length} de {rows.length} quotas</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["geral", "diario"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {t === "geral" ? "Geral" : "Diário (hoje)"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Ranking ainda vazio" description={tab === "diario" ? "Nenhum jogo encerrado hoje ainda." : "Ninguém na perebada palpitou ainda. Vamos lá."} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {lista.map((p, i) => {
            const isMe = p.user_id === user?.id;
            const apelido = p.profile?.apelido ?? "—";
            const sigla = (p.profile?.sigla ?? p.profile?.apelido ?? "??").slice(0, 3).toUpperCase();
            const cor = isMe && p.profile?.cor ? p.profile.cor : "oklch(0.6 0.16 200)";
            const showBreakdown = p.jec !== undefined;
            const isOpen = expanded.has(p.id);
            return (
              <div
                key={p.id}
                className={`border-b border-border px-4 py-4 last:border-0 ${isMe ? "bg-secondary" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 text-center">
                    {(p.posicao ?? i + 1) <= 3 ? (
                      <div className="flex flex-col items-center">
                        <Trophy className={`mx-auto h-5 w-5 ${(p.posicao ?? i + 1) === 1 ? "text-accent" : (p.posicao ?? i + 1) === 2 ? "text-muted-foreground" : "text-amber-700"}`} />
                        <span className="font-display text-[10px] font-bold text-muted-foreground">{p.posicao ?? i + 1}º</span>
                      </div>
                    ) : (
                      <span className="font-display font-bold text-muted-foreground">{p.posicao ?? i + 1}º</span>
                    )}
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: cor }}>
                    {sigla}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/app/pereba/$user_id"
                        params={{ user_id: p.user_id }}
                        search={{ quota: p.numero }}
                        className="font-display font-bold hover:underline"
                      >
                        {apelido}
                        {isMe && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">você</span>}
                      </Link>
                      {tab === "geral" && <VariacaoRanking v={p.variacao} />}
                    </div>
                    <p className="text-xs text-muted-foreground">Quota #{p.numero}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold">{(p.pontos ?? 0).toLocaleString("pt-BR")}</p>
                    {showBreakdown && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(p.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <><ChevronUp className="h-3 w-3" />Ocultar</> : <><ChevronDown className="h-3 w-3" />Detalhes</>}
                      </button>
                    )}
                  </div>
                </div>
                {showBreakdown && isOpen && (
                  <RankingBreakdown
                    b={{
                      jec: p.jec ?? 0,
                      pex: p.pex ?? 0,
                      rdf: p.rdf ?? 0,
                      rgm: p.rgm ?? 0,
                      rgv: p.rgv ?? 0,
                      res: p.res ?? 0,
                      jzr: p.jzr ?? 0,
                      npt: p.npt ?? 0,
                      aproveitamento_pct: p.aproveitamento_pct ?? null,
                      jogos_pontuados: (p.pex ?? 0) + (p.rdf ?? 0) + (p.rgm ?? 0) + (p.rgv ?? 0) + (p.res ?? 0),
                      jogos_disputados: (p.pex ?? 0) + (p.rdf ?? 0) + (p.rgm ?? 0) + (p.rgv ?? 0) + (p.res ?? 0) + (p.jzr ?? 0),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

