import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, ChevronRight, Lock, Sparkles, ListOrdered, Newspaper, CalendarDays, Target } from "lucide-react";
import { useChampionsTotal } from "@/lib/queries/champions";
import { useSetting } from "@/lib/queries/settings";
import { useProfile } from "@/lib/queries/profiles";
import { PesquisaPopup } from "@/components/pesquisa-popup";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Bolão dos Perebas" },
      { name: "description", content: "Seu lobby de competições: bolões futuros e bolões encerrados da Perebada." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: profile } = useProfile();
  const { data: championsStatus } = useSetting<string>("champions_card_status");
  const status = championsStatus === "confirmado" || championsStatus === "cancelado" ? championsStatus : "pesquisa";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold">
          Olá, {profile?.apelido ?? "pereba"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha uma competição pra acompanhar.</p>
      </div>

      <section>
        <h2 className="font-display text-xl font-bold">Bolões futuros</h2>
        <div className="mt-4 grid gap-3">
          {status !== "cancelado" && <ChampionsCard confirmado={status === "confirmado"} />}
          <FemininaCard />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Bolões encerrados</h2>
        <div className="mt-4">
          <CopaEncerradaCard />
        </div>
      </section>

      <PesquisaPopup />
    </div>
  );
}

function ChampionsCard({ confirmado }: { confirmado: boolean }) {
  const { data } = useChampionsTotal();
  const total = data?.quotas_total ?? 0;
  const quorum = data?.quorum ?? 35;
  const pct = quorum > 0 ? Math.min(100, Math.round((total / quorum) * 100)) : 0;

  return (
    <Link
      to="/app/champions"
      className="group block rounded-3xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          {confirmado ? (
            <span className="inline-flex rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success">
              Confirmado — inscrições em breve
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              Em pesquisa de interesse — até 07/08
            </span>
          )}
          <p className="mt-2 font-display text-lg font-bold">Champions 2026/27</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A próxima da Perebada: mata-mata europeu, palpite a palpite.
          </p>
          {!confirmado && (
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

function FemininaCard() {
  return (
    <Link
      to="/app/feminina"
      className="group block rounded-3xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            Em breve — junho de 2027
          </span>
          <p className="mt-2 font-display text-lg font-bold">Copa do Mundo Feminina 2027</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A próxima grande resenha da Perebada.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

const ATALHOS_COPA = [
  { to: "/app/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/app/wrapped", label: "Wrapped", icon: Sparkles },
  { to: "/app/boletim", label: "Boletins", icon: Newspaper },
  { to: "/app/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/app/palpites", label: "Palpites", icon: Target },
] as const;

function CopaEncerradaCard() {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-card">
      <Link
        to="/app/ranking"
        className="group block rounded-t-3xl p-6 transition hover:bg-muted/40"
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/25 bg-muted/50 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              <Lock className="h-3 w-3" /> Encerrada
            </span>
            <p className="mt-2 font-display text-lg font-bold">Copa do Mundo 2026</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              🏆 Campeão: Anão #2 · 71 perebas · 111 quotas
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>
      </Link>
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
    </div>
  );
}
