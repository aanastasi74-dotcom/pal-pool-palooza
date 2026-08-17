import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, ChevronRight, Lock, Sparkles, ListOrdered, Newspaper, CalendarDays, Target } from "lucide-react";
import { useProfile } from "@/lib/queries/profiles";
import { PesquisaPopup } from "@/components/pesquisa-popup";
import {
  useCompeticoes,
  useManifestacaoTotal,
  competicaoRota,
  nomeCurtoTitulo,
  type Competicao,
} from "@/lib/queries/competicoes";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Bolão dos Perebas" },
      { name: "description", content: "Seu lobby de competições: bolões futuros e bolões encerrados da Perebada." },
    ],
  }),
  component: Home,
});

const TAGLINES: Record<string, string> = {
  champions2627: "A próxima da Perebada: mata-mata europeu, palpite a palpite.",
  feminina2027: "A próxima grande resenha da Perebada.",
  copa2026: "🏆 Campeão: Anão #2 · 71 perebas · 111 quotas",
};

const FUTUROS = ["pesquisa", "inscricoes", "ativa", "rascunho"];
const ENCERRADOS = ["encerrada", "arquivada"];

function Home() {
  const { data: profile } = useProfile();
  const { data: competicoes = [] } = useCompeticoes();

  const futuros = competicoes.filter((c) => FUTUROS.includes(c.status));
  const encerrados = competicoes.filter((c) => ENCERRADOS.includes(c.status));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold">
          Olá, {profile?.apelido ?? "pereba"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha uma competição pra acompanhar.</p>
      </div>

      {futuros.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Bolões futuros</h2>
          <div className="mt-4 grid gap-3">
            {futuros.map((c) => (
              <CompeticaoFuturaCard key={c.id} competicao={c} />
            ))}
          </div>
        </section>
      )}

      {encerrados.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Bolões encerrados</h2>
          <div className="mt-4 grid gap-3">
            {encerrados.map((c) => (
              <CompeticaoEncerradaCard key={c.id} competicao={c} />
            ))}
          </div>
        </section>
      )}

      <PesquisaPopup />
    </div>
  );
}

function mesAno(iso: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(" de ", " de ");
}

function Badge({ tone, children }: { tone: "amber" | "success" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : tone === "success"
        ? "border-success/30 bg-success/10 text-success"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>
  );
}

function CompeticaoFuturaCard({ competicao: c }: { competicao: Competicao }) {
  const emPesquisa = c.status === "pesquisa";
  const { data: manifest } = useManifestacaoTotal(c.slug, emPesquisa);
  const total = manifest?.quotas_total ?? 0;
  const quorum = manifest?.quorum ?? c.quorum_quotas ?? 0;
  const pct = quorum > 0 ? Math.min(100, Math.round((total / quorum) * 100)) : 0;
  const prazo = manifest?.prazo
    ? new Date(manifest.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const destaque = c.status !== "rascunho";

  return (
    <Link
      to={competicaoRota(c.slug) as string}
      className="group block rounded-3xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="flex items-start gap-4">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
            destaque ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          }`}
        >
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          {c.status === "pesquisa" && (
            <Badge tone="amber">Em pesquisa de interesse{prazo ? ` — até ${prazo}` : ""}</Badge>
          )}
          {c.status === "inscricoes" && <Badge tone="success">Inscrições abertas</Badge>}
          {c.status === "ativa" && <Badge tone="success">Rolando agora</Badge>}
          {c.status === "rascunho" && (
            <Badge tone="muted">Em breve{mesAno(c.inicio) ? ` — ${mesAno(c.inicio)}` : ""}</Badge>
          )}
          <p className="mt-2 font-display text-lg font-bold">{nomeCurtoTitulo(c)}</p>
          {TAGLINES[c.slug] && <p className="mt-0.5 text-xs text-muted-foreground">{TAGLINES[c.slug]}</p>}
          {emPesquisa && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {total} de {quorum} quotas manifestadas
              </p>
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

const ATALHOS_COPA = [
  { to: "/app/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/app/wrapped", label: "Wrapped", icon: Sparkles },
  { to: "/app/boletins", label: "Boletins", icon: Newspaper },
  { to: "/app/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/app/palpites", label: "Palpites", icon: Target },
] as const;

function CompeticaoEncerradaCard({ competicao: c }: { competicao: Competicao }) {
  const arquivada = c.status === "arquivada";
  const isCopa = c.slug === "copa2026";

  return (
    <div className="rounded-3xl border border-border bg-card shadow-card">
      <Link
        to={competicaoRota(c.slug) as string}
        className="group block rounded-t-3xl p-6 transition hover:bg-muted/40"
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/25 bg-muted/50 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              {arquivada && <Lock className="h-3 w-3" />} Encerrada
            </span>
            <p className="mt-2 font-display text-lg font-bold">{nomeCurtoTitulo(c)}</p>
            {TAGLINES[c.slug] && <p className="mt-0.5 text-xs text-muted-foreground">{TAGLINES[c.slug]}</p>}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>
      </Link>
      {isCopa && (
        <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
          {ATALHOS_COPA.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
