import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, Sparkles, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useChampionsTotalPublico,
  useRegistrarInteresseExterno,
} from "@/lib/queries/champions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/champions")({
  head: () => ({
    meta: [
      { title: "Bolão da Champions 2026/27 — Manifestação de interesse" },
      {
        name: "description",
        content:
          "Manifeste seu interesse no Bolão da Champions League 2026/27 dos Perebas. Palpite jogo a jogo e dispute o pote.",
      },
      { property: "og:title", content: "Bolão da Champions 2026/27 — bora?" },
      {
        property: "og:description",
        content:
          "Bolão privado da UEFA Champions League 2026/27: quota R$ 70, quórum de 35 até 07/08. Manifeste seu interesse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChampionsPublicPage,
});

function ChampionsPublicPage() {
  const { user, isLoading } = useAuth();
  const { data: total, isLoading: loadingTotal } = useChampionsTotalPublico();

  const prazo = total?.prazo ? new Date(total.prazo) : null;
  const prazoEncerrado = prazo ? new Date() > prazo : false;
  const prazoFmt = prazo
    ? prazo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "07/08";
  const quorum = total?.quorum ?? 35;
  const quotasTotal = total?.quotas_total ?? 0;
  const pct = Math.min(100, Math.round((quotasTotal / quorum) * 100));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
              <p className="text-[10px] uppercase tracking-widest opacity-80">Champions 2026/27</p>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" /> Manifestação de interesse
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 pb-24">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h1 className="font-display text-3xl font-extrabold leading-tight">
            Bolão da Champions 2026/27 — bora?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Um bolão da UEFA Champions League 2026/27 no mesmo espírito da Copa: palpite jogo a
            jogo, ranking dinâmico, boletim do cronista e prêmio no fim.
          </p>

          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
            <p className="font-bold">Vindo direto da Copa 2026:</p>
            <p className="text-muted-foreground">
              Acabamos de encerrar o Bolão da Copa 2026: <strong>111 quotas</strong>,{" "}
              <strong>71 participantes</strong>, nota <strong>9,79</strong> de avaliação e{" "}
              <strong>R$ 5.550</strong> de prêmios pagos.
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Como funciona</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Cada pereba pode comprar até 5 quotas.</li>
            <li>Palpites por jogo desde a fase de liga até a final.</li>
            <li>Top 4 do mata-mata pra apimentar.</li>
          </ul>

          <h2 className="pt-2 font-display text-lg font-bold">Quanto custa</h2>
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="font-bold">R$ 70 por quota</p>
            <p className="text-muted-foreground">
              R$ 50 vai pro <strong>pote de prêmio</strong> e R$ 20 cobre{" "}
              <strong>custos de infra</strong>.
            </p>
          </div>

          <h2 className="pt-2 font-display text-lg font-bold">Condição pra rolar</h2>
          <p className="text-sm text-muted-foreground">
            Precisamos de{" "}
            <strong>
              {quorum} quotas manifestadas até {prazoFmt}
            </strong>
            . Não bateu quórum? Não rola — e ninguém paga nada. Nada é cobrado agora; a manifestação
            é só um sinal de interesse.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Termômetro público</h2>
          {loadingTotal ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <p className="text-sm">
                Já temos <strong>{quotasTotal} quotas</strong> manifestadas.
              </p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {quotasTotal} / {quorum} — {pct}% do quórum
              </p>
            </>
          )}
        </section>

        {isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : user ? (
          <section className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center shadow-card">
            <p className="font-display text-lg font-bold">Você já é da Perebada! 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua manifestação vai pela página interna, com seu perfil já conectado.
            </p>
            <Link
              to="/app/champions"
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Ir para /app/champions →
            </Link>
          </section>
        ) : (
          <FormExterno prazoEncerrado={prazoEncerrado} prazoFmt={prazoFmt} />
        )}

        <p className="text-center text-xs text-muted-foreground">
          O Bolão dos Perebas é um grupo fechado de amigos. Manifestar interesse não cria conta —
          se o bolão confirmar, a entrada é por convite.
        </p>
      </main>
    </div>
  );
}

function FormExterno({
  prazoEncerrado,
  prazoFmt,
}: {
  prazoEncerrado: boolean;
  prazoFmt: string;
}) {
  const registrar = useRegistrarInteresseExterno();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [quotas, setQuotas] = useState(1);
  const [indicadoPor, setIndicadoPor] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    if (nomeTrim.length < 2) return toast.error("Coloca um nome válido.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return toast.error("Email inválido.");
    if (quotas < 1 || quotas > 5) return toast.error("Escolha de 1 a 5 quotas.");
    try {
      await registrar.mutateAsync({
        nome: nomeTrim,
        email: emailTrim,
        quotas,
        indicado_por: indicadoPor,
      });
      setOk(true);
      toast.success("Interesse registrado!");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao registrar.");
    }
  };

  if (ok) {
    return (
      <section className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 font-display text-lg font-bold">Interesse registrado!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Se o bolão sair, você recebe o convite por email.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="font-display text-lg font-bold">Manifeste seu interesse</h2>
        <p className="text-xs text-muted-foreground">
          {prazoEncerrado
            ? `O prazo encerrou em ${prazoFmt}.`
            : `Sem cobrança agora — só um sinal de interesse até ${prazoFmt}.`}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Seu nome
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            disabled={prazoEncerrado || registrar.isPending}
            required
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Ex.: João Silva"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            disabled={prazoEncerrado || registrar.isPending}
            required
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="voce@email.com"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Quantas quotas?
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const ativo = quotas === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={prazoEncerrado || registrar.isPending}
                  onClick={() => setQuotas(n)}
                  className={`grid h-12 w-12 place-items-center rounded-xl border text-lg font-bold transition-colors ${
                    ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  } disabled:opacity-50`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Quem te indicou? <span className="opacity-60">(opcional)</span>
          </label>
          <input
            value={indicadoPor}
            onChange={(e) => setIndicadoPor(e.target.value)}
            maxLength={80}
            disabled={prazoEncerrado || registrar.isPending}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="apelido do pereba que te chamou"
          />
        </div>

        <button
          type="submit"
          disabled={prazoEncerrado || registrar.isPending}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {registrar.isPending ? "Salvando..." : "Registrar interesse"}
        </button>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Isso é só uma manifestação de interesse — nada é cobrado agora. A entrada oficial é por
          convite se o bolão confirmar.
        </p>
      </form>
    </section>
  );
}
