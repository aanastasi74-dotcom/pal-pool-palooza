import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightbulb, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo } from "react";
import { calcularEngajamento, isElegivelLanterna, estaNosUltimos25, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";
import { useRanking } from "@/lib/queries/profiles";
import { useMinhasQuotas, useTotalQuotas } from "@/lib/queries/quotas";
import { useAuth } from "@/lib/auth-context";
import { PesquisaPopup } from "@/components/pesquisa-popup";
import { WrappedCard } from "@/components/wrapped-card";
import { VitrinePodio } from "@/components/vitrine-podio";
import { VitrineNumeros } from "@/components/vitrine-numeros";
import { VitrineColecao } from "@/components/vitrine-colecao";

export const Route = createFileRoute("/app/copa2026")({
  head: () => ({
    meta: [
      { title: "Copa do Mundo 2026 — Bolão dos Perebas" },
      { name: "description", content: "O memorial da Copa 2026: pódio final, a Copa em números, boletins, wrapped e ranking da Perebada." },
      { property: "og:title", content: "Copa do Mundo 2026 — Bolão dos Perebas" },
      { property: "og:description", content: "O memorial da Copa 2026: pódio final, a Copa em números, boletins, wrapped e ranking da Perebada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Copa2026Home,
});

function Copa2026Home() {
  const { user } = useAuth();
  const { data: ranking = [] } = useRanking();
  const { data: minhasQuotas = [] } = useMinhasQuotas();

  const minhaMelhor = useMemo(() => {
    if (!user) return null;
    const minhas = (ranking as any[]).filter((r) => r.user_id === user.id);
    if (!minhas.length) return null;
    return minhas.reduce((a, b) => ((a.posicao ?? 9999) <= (b.posicao ?? 9999) ? a : b));
  }, [ranking, user]);

  return (
    <div className="space-y-10">
      <VitrinePodio />

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Sua posição na perebada</p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="font-display text-5xl font-black sm:text-6xl">
            {minhaMelhor?.posicao ? `${minhaMelhor.posicao}º` : "—"}
          </p>
          <div className="pb-2">
            <p className="font-display text-2xl font-bold">{(minhaMelhor?.pontos ?? 0).toLocaleString("pt-BR")} pts</p>
            <p className="text-xs text-muted-foreground">{minhasQuotas.length} quota{minhasQuotas.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Placares exatos" valor={minhaMelhor ? String(minhaMelhor.pex ?? 0) : "—"} />
          <Stat
            label="Jogos pontuados"
            valor={minhaMelhor ? String((minhaMelhor.pex ?? 0) + (minhaMelhor.rdf ?? 0) + (minhaMelhor.rgm ?? 0) + (minhaMelhor.rgv ?? 0) + (minhaMelhor.res ?? 0)) : "—"}
          />
          <StatAproveitamento q={minhaMelhor} />
        </div>
      </section>

      <LanternaAviso />

      <section>
        <h2 className="font-display text-xl font-bold">A Copa em números</h2>
        <div className="mt-4">
          <VitrineNumeros />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">A coleção</h2>
        <div className="mt-4 space-y-3">
          <WrappedCard />
          <VitrineColecao />
        </div>
      </section>

      <PesquisaPopup />
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="font-display text-xl font-bold">{valor}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}


function StatAproveitamento({ q }: { q: any }) {
  const disputados = q ? (q.jec ?? 0) - (q.npt ?? 0) : 0;
  const pontuados = q ? (q.pex ?? 0) + (q.rdf ?? 0) + (q.rgm ?? 0) + (q.rgv ?? 0) + (q.res ?? 0) : 0;
  const valor = disputados > 0 ? `${Math.round((pontuados / disputados) * 100)}%` : "—";
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <p className="font-display text-xl font-bold">{valor}</p>
      <div className="flex items-center justify-center gap-1">
        <p className="text-[10px] uppercase tracking-widest opacity-80">Aproveitamento</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="opacity-80 hover:opacity-100" aria-label="O que é aproveitamento?">
              <Info className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 text-xs text-foreground">
            Aproveitamento = jogos onde você pontuou ÷ jogos disputados. Se palpitou em 36 jogos e pontuou em 30, aproveitamento é 83%.
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <Link to={link} className="text-xs font-semibold text-primary hover:underline">Ver tudo</Link>
    </div>
  );
}

function LanternaAviso() {
  const { data: minhasQuotas = [] } = useMinhasQuotas();
  const { data: totalQuotas = 0 } = useTotalQuotas();
  const quotasNoFundo = (minhasQuotas as any[]).filter((q) => estaNosUltimos25(q.posicao ?? 9999, totalQuotas));
  if (quotasNoFundo.length === 0) return null;
  const q = quotasNoFundo.sort((a, b) => (a.posicao ?? 9999) - (b.posicao ?? 9999))[0];
  const eng = calcularEngajamento(q.palpites_validos ?? 0, q.palpites_possiveis ?? 0);
  const elegivel = isElegivelLanterna(q);
  return (
    <section className={`rounded-3xl border p-5 shadow-card ${elegivel ? "border-success/40 bg-success/5" : "border-accent/40 bg-accent/10"}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${elegivel ? "bg-success/15 text-success" : "bg-accent/30 text-accent-foreground"}`}>
          <Lightbulb className="h-5 w-5 rotate-180" />
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-bold">
            {elegivel
              ? "Sua quota tá no fundo, mas elegível ao lanterninha. Mantém o ritmo, pereba."
              : "Sua quota está nos 25% finais. Lanterninha vale 5% do prêmio — mas só pra quem palpitou direito."}
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Criterio
              ok={eng >= ENGAJAMENTO_MIN}
              label={`Palpites válidos: ${q.palpites_validos ?? 0}/${q.palpites_possiveis ?? 0} (${(eng * 100).toFixed(0)}%) — mín. ${ENGAJAMENTO_MIN * 100}%`}
            />
            <Criterio
              ok={(q.pontos ?? 0) >= PONTOS_MIN}
              label={`Pontuação: ${q.pontos ?? 0} — mín. ${PONTOS_MIN}`}
            />
          </div>
          <Link to="/app/perfil" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
            Ver detalhes
          </Link>
        </div>
      </div>
    </section>
  );
}

function Criterio({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-1 ${ok ? "text-success" : "text-accent-foreground"}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
