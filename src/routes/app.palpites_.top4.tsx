import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, Lock, Pencil, X, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { useMinhasQuotas } from "@/lib/queries/quotas";
import { useMyTop4, useUpdateTop4, useFaseAtual } from "@/lib/queries/top4";
import { useTeams } from "@/lib/queries/teams";
import { useSetting } from "@/lib/queries/settings";
import { useRanking } from "@/lib/queries/profiles";
import { supabase } from "@/integrations/supabase/client";
import { getRegraDaFase, TOP4_REGRA_DEFAULT, type Top4Regra } from "@/lib/top4-rules";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Top4PotencialCard } from "@/components/top4-potencial-card";
import { Top4ConfirmMudancaDialog } from "@/components/top4-confirm-mudanca-dialog";
import { Top4QuotaContent } from "@/components/top4-quota-detalhe-dialog";
import { calcularPotencialMaximoTop4 } from "@/lib/top4-potencial/engine";

export const Route = createFileRoute("/app/palpites_/top4")({
  head: () => ({ meta: [{ title: "Top 4 — Bolão dos Perebas" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: Top4Page,
});

function bannerCls(fase: string, bloqueada: boolean) {
  if (bloqueada) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (fase === "antes_copa") return "border-success/40 bg-success/10 text-success";
  if (fase === "grupos") return "border-accent/40 bg-gold text-gold-foreground";
  if (fase === "round_32" || fase === "round_of_32") return "border-orange-500/40 bg-orange-500/10 text-orange-700";
  return "border-destructive/40 bg-destructive/10 text-destructive";
}

function bannerTexto(fase: string, bloqueada: boolean, lockData?: string | null) {
  if (bloqueada) {
    const dt = lockData ? new Date(lockData).toLocaleDateString("pt-BR") : "—";
    return `Palpites travados desde ${dt}. Boa sorte com suas escolhas, pereba!`;
  }
  if (fase === "antes_copa") return "Perebada, a Copa ainda não começou — cada acerto aqui vale 1000 pontos. Potencial máximo: 4000 pts";
  if (fase === "grupos") return "Atenção pereba, já estamos na fase de grupos! Se mudar palpite agora, cada acerto vale só 500 pts";
  if (fase === "round_32" || fase === "round_of_32") return "Olho vivo pereba, estamos no Round of 32 — última chance de mudar, mas cada acerto valerá só 250 pts";
  return "Palpites do Top 4 já travados.";
}

function Top4Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: quotas = [], isLoading: loadingQ } = useMinhasQuotas();
  const [quotaId, setQuotaId] = useState<string | undefined>(undefined);
  const quota = useMemo(
    () => (quotas as any[]).find((q) => q.id === quotaId) ?? (quotas as any[])[0],
    [quotas, quotaId],
  );
  useEffect(() => {
    if (!quotaId && quotas.length) setQuotaId((quotas as any[])[0].id);
  }, [quotas, quotaId]);

  const { data: faseAtual = "antes_copa", isLoading: loadingF } = useFaseAtual();
  const { data: top4Windows } = useSetting<Top4Regra[]>("top4_windows");
  const { data: publicoAt } = useSetting<string>("top4_publico_a_partir_de");
  const { data: top4, isLoading: loadingT } = useMyTop4(quota?.id);
  const { data: teams = [], isLoading: loadingTeams } = useTeams();
  const update = useUpdateTop4();

  const teamsSorted = useMemo(
    () => [...teams].sort((a, b) => a.nome_pt.localeCompare(b.nome_pt, "pt-BR")),
    [teams],
  );
  const teamByCode = useMemo(
    () => new Map(teams.map((t) => [t.bracket_position, t])),
    [teams],
  );

  const regras = (top4Windows && Array.isArray(top4Windows) && top4Windows.length ? top4Windows : TOP4_REGRA_DEFAULT) as Top4Regra[];
  const regra = getRegraDaFase(faseAtual, regras);
  const bloqueada = regra.bloqueada;

  const [picks, setPicks] = useState<string[]>(["", "", "", ""]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    setPicks([top4?.posicao_1 ?? "", top4?.posicao_2 ?? "", top4?.posicao_3 ?? "", top4?.posicao_4 ?? ""]);
    setEditando(false);
  }, [top4, quotaId]);

  const temPalpiteAnterior = !!(top4?.posicao_1 && top4?.posicao_2 && top4?.posicao_3 && top4?.posicao_4);
  const travado = bloqueada || (temPalpiteAnterior && !editando);

  const setPos = (i: number, v: string) => {
    if (travado) return;
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
        onSuccess: () => { setEditando(false); toast.success("Top 4 salvo. Boa sorte, perebada!"); },
        onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar."),
      },
    );
  };

  const picksAntigos = useMemo(
    () => ({
      campeao: top4?.posicao_1 ?? "",
      vice: top4?.posicao_2 ?? "",
      terceiro: top4?.posicao_3 ?? "",
      quarto: top4?.posicao_4 ?? "",
    }),
    [top4],
  );
  const picksNovos = useMemo(
    () => ({ campeao: picks[0], vice: picks[1], terceiro: picks[2], quarto: picks[3] }),
    [picks],
  );
  const mudou =
    picksAntigos.campeao !== picksNovos.campeao ||
    picksAntigos.vice !== picksNovos.vice ||
    picksAntigos.terceiro !== picksNovos.terceiro ||
    picksAntigos.quarto !== picksNovos.quarto;
  const pesoAtual = top4?.peso_no_palpite ?? regra.eficacia;

  const handleClickSalvar = () => {
    // Sem mudança real → salva direto (sem dialog)
    if (!mudou) {
      salvar();
      return;
    }
    // Primeiro palpite (ou antes da Copa, sem perda de eficácia) → sem dialog
    if (!temPalpiteAnterior || faseAtual === "antes_copa") {
      salvar();
      return;
    }
    setConfirmOpen(true);
  };

  if (loadingQ || loadingF || loadingT || loadingTeams) return <Skeleton className="h-96 w-full" />;
  if (!quota) {
    return <EmptyState icon={Sparkles} title="Sem quota ativa" description="Compra uma quota pra palpitar no Top 4." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Top 4 da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quem leva a taça e quem fica no quase. Vale até 4.000 pts.</p>
      </div>

      {quotas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
          <span className="text-xs font-semibold text-muted-foreground">Palpitando para:</span>
          <select
            value={quota.id}
            onChange={(e) => setQuotaId(e.target.value)}
            className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {(quotas as any[]).map((q) => (
              <option key={q.id} value={q.id}>Quota #{q.numero}</option>
            ))}
          </select>
        </div>
      )}

      <section className={`rounded-2xl border p-4 shadow-card ${bannerCls(faseAtual, bloqueada)}`}>
        <div className="flex items-start gap-3">
          {bloqueada ? <Lock className="mt-1 h-5 w-5" /> : <Sparkles className="mt-1 h-5 w-5" />}
          <div>
            <p className="font-display font-bold">{bannerTexto(faseAtual, bloqueada, top4?.alterado_em)}</p>
            <p className="mt-1 text-xs opacity-80">
              Estamos em: <strong>{regra.label}</strong> · eficácia <strong>{regra.eficacia}%</strong> · potencial máx. <strong>{regra.max_pontos.toLocaleString("pt-BR")} pts</strong>
            </p>
          </div>
        </div>
      </section>

      {temPalpiteAnterior && (
        <Top4PotencialCard
          picks={picksAntigos}
          pesoPercentual={pesoAtual}
          potencialInicial={(quota as any)?.top4_potencial_inicial ?? null}
        />
      )}

      {bloqueada && (
        <div className="flex items-center gap-2 rounded-2xl border border-muted-foreground/30 bg-muted/40 px-4 py-3 text-sm">
          <Lock className="h-4 w-4" /> A janela do Top 4 já fechou. Seu palpite atual permanece como registrado.
        </div>
      )}

      {!bloqueada && temPalpiteAnterior && !editando && (
        <button
          onClick={() => setEditando(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-card px-6 py-3 text-sm font-bold text-primary shadow-card hover:bg-primary/5"
        >
          <Pencil className="h-4 w-4" /> Editar palpite Top 4
        </button>
      )}

      {!bloqueada && editando && faseAtual !== "antes_copa" && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Mudar agora reduz o potencial para {regra.max_pontos.toLocaleString("pt-BR")} pts (eficácia {regra.eficacia}%).
        </div>
      )}

      <div className="space-y-3">
        {picks.map((pick, i) => {
          const selectedTeam = teamByCode.get(pick);
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-gold-foreground">
                {i + 1}º
              </div>
              <span className="text-3xl">{selectedTeam?.bandeira_emoji ?? "🏳️"}</span>
              <select
                value={pick}
                disabled={travado}
                onChange={(e) => setPos(i, e.target.value)}
                className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              >
                <option value="">— escolher —</option>
                {teamsSorted.map((t) => {
                  const code = t.bracket_position;
                  const usadoEm = picks.indexOf(code);
                  const desabilitado = usadoEm !== -1 && usadoEm !== i;
                  return (
                    <option key={code} value={code} disabled={desabilitado}>
                      {t.bandeira_emoji} {t.nome_pt}{desabilitado ? ` (na ${usadoEm + 1}ª)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      {!bloqueada && (!temPalpiteAnterior || editando) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {temPalpiteAnterior && (
            <button
              onClick={() => {
                setPicks([
                  top4?.posicao_1 ?? "",
                  top4?.posicao_2 ?? "",
                  top4?.posicao_3 ?? "",
                  top4?.posicao_4 ?? "",
                ]);
                setEditando(false);
              }}
              disabled={update.isPending}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-muted-foreground hover:bg-muted/40 sm:w-auto"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          )}
          <button
            onClick={handleClickSalvar}
            disabled={update.isPending}
            className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {update.isPending ? "Salvando…" : "Salvar palpite Top 4"}
          </button>
        </div>
      )}

      <Top4ConfirmMudancaDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        picksAntigos={picksAntigos}
        picksNovos={picksNovos}
        pesoAtual={pesoAtual}
        pesoNovo={regra.eficacia}
        onConfirm={() => {
          setConfirmOpen(false);
          salvar();
        }}
      />

      <PublicoOutrosSection
        publicoAt={publicoAt ?? null}
        teams={teams}
        initialQuotaId={search.q ?? null}
        onConsumeInitial={() => navigate({ search: (prev: any) => ({ ...prev, q: undefined }), replace: true })}
      />
    </div>
  );
}

function PublicoOutrosSection({
  publicoAt,
  teams,
  initialQuotaId,
  onConsumeInitial,
}: {
  publicoAt: string | null;
  teams: any[];
  initialQuotaId: string | null;
  onConsumeInitial: () => void;
}) {
  const publico = useMemo(() => {
    if (!publicoAt) return false;
    return Date.now() >= new Date(publicoAt).getTime();
  }, [publicoAt]);

  const dataAbertura = publicoAt ? new Date(publicoAt) : null;

  const { data: rows = [] } = useRanking();
  const { data: matches = [] } = useQuery({
    queryKey: ["matches", "top4-publico-outros"],
    enabled: publico,
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

  const [ordem, setOrdem] = useState<"ranking" | "alfabetico">("ranking");
  const [userSel, setUserSel] = useState<string>("");
  const [quotaSel, setQuotaSel] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialHandled, setInitialHandled] = useState(false);

  const comPalpite = useMemo(
    () => (rows as any[]).filter((r) => r.top4_p1 && r.top4_p2 && r.top4_p3 && r.top4_p4),
    [rows],
  );

  const perebas = useMemo(() => {
    const byUser = new Map<string, { user_id: string; apelido: string; quotas: any[]; melhorPos: number }>();
    for (const r of comPalpite) {
      const u = r.user_id;
      const cur = byUser.get(u);
      const apelido = r.profile?.apelido ?? "—";
      const pos = r.posicao ?? 9999;
      if (cur) {
        cur.quotas.push(r);
        if (pos < cur.melhorPos) cur.melhorPos = pos;
      } else {
        byUser.set(u, { user_id: u, apelido, quotas: [r], melhorPos: pos });
      }
    }
    const arr = Array.from(byUser.values());
    arr.forEach((p) => p.quotas.sort((a, b) => (a.posicao ?? 9999) - (b.posicao ?? 9999)));
    if (ordem === "ranking") arr.sort((a, b) => a.melhorPos - b.melhorPos);
    else arr.sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR", { sensitivity: "base" }));
    return arr;
  }, [comPalpite, ordem]);

  const perebaSel = useMemo(() => perebas.find((p) => p.user_id === userSel) ?? null, [perebas, userSel]);
  const quotaAtiva = useMemo(() => {
    if (!perebaSel) return null;
    return perebaSel.quotas.find((q) => q.id === quotaSel) ?? perebaSel.quotas[0] ?? null;
  }, [perebaSel, quotaSel]);

  // Deep-link: ?q=<quotaId>
  useEffect(() => {
    if (initialHandled) return;
    if (!initialQuotaId) return;
    if (!rows.length) return;
    setInitialHandled(true);
    if (!publico) {
      const dt = dataAbertura ? dataAbertura.toLocaleString("pt-BR") : "em breve";
      toast.info(`Top 4 dos outros perebas fica público a partir de ${dt}.`);
      onConsumeInitial();
      return;
    }
    const alvo = (rows as any[]).find((r) => r.id === initialQuotaId);
    if (!alvo || !alvo.top4_p1) {
      toast.error("Quota não encontrada ou sem Top 4 registrado.");
      onConsumeInitial();
      return;
    }
    setUserSel(alvo.user_id);
    setQuotaSel(alvo.id);
    setDialogOpen(true);
  }, [initialQuotaId, rows, publico, dataAbertura, initialHandled, onConsumeInitial]);

  const potencial = useMemo(() => {
    if (!quotaAtiva || !matches.length || !teams.length) return 0;
    const r = calcularPotencialMaximoTop4(
      {
        campeao: quotaAtiva.top4_p1,
        vice: quotaAtiva.top4_p2,
        terceiro: quotaAtiva.top4_p3,
        quarto: quotaAtiva.top4_p4,
      },
      matches as any,
      teams as any,
      quotaAtiva.top4_peso ?? 100,
    );
    return r.faseGruposCompleta ? r.pontos : 0;
  }, [quotaAtiva, matches, teams]);

  const copiarLink = async () => {
    if (!quotaAtiva) return;
    const url = `${window.location.origin}/app/palpites/top4?q=${quotaAtiva.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Copia manualmente da barra de endereço.");
    }
  };

  if (!publico) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Ver Top 4 de outros perebas</h2>
      </div>

      <div className="mb-3 inline-flex rounded-full border border-border bg-secondary p-0.5 text-xs font-semibold">
        {(["ranking", "alfabetico"] as const).map((o) => (
          <button
            key={o}
            onClick={() => setOrdem(o)}
            className={`rounded-full px-3 py-1 transition ${
              ordem === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o === "ranking" ? "Por ranking" : "Alfabético"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={userSel}
          onChange={(e) => {
            setUserSel(e.target.value);
            setQuotaSel("");
          }}
          className="flex-1 rounded-2xl border border-border bg-secondary px-3 py-2 text-sm font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">— escolher pereba —</option>
          {perebas.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {ordem === "ranking" && p.melhorPos < 9999 ? `${p.melhorPos}º · ` : ""}
              {p.apelido}
              {p.quotas.length > 1 ? ` (${p.quotas.length} quotas)` : ""}
            </option>
          ))}
        </select>

        {perebaSel && perebaSel.quotas.length > 1 && (
          <select
            value={quotaAtiva?.id ?? ""}
            onChange={(e) => setQuotaSel(e.target.value)}
            className="rounded-2xl border border-border bg-secondary px-3 py-2 text-sm font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {perebaSel.quotas.map((q) => (
              <option key={q.id} value={q.id}>
                Quota #{q.numero}
                {q.posicao ? ` · ${q.posicao}º` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {quotaAtiva && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Eye className="h-3.5 w-3.5" /> Ver Top 4
          </button>
          <button
            onClick={copiarLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/40"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar link
          </button>
        </div>
      )}

      {quotaAtiva && (
        <Top4QuotaDetalheDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          apelido={perebaSel?.apelido ?? "—"}
          numero={quotaAtiva.numero}
          picks={{
            campeao: quotaAtiva.top4_p1,
            vice: quotaAtiva.top4_p2,
            terceiro: quotaAtiva.top4_p3,
            quarto: quotaAtiva.top4_p4,
          }}
          teams={teams as any}
          matches={matches as any}
          potencial={potencial}
          peso={quotaAtiva.top4_peso ?? 100}
        />
      )}
    </section>
  );
}
