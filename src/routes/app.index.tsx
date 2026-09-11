import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, ChevronRight, Lock, Sparkles, ListOrdered, Newspaper, CalendarDays, Target, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/lib/queries/profiles";
import { useCriarIndicacao, usePromotorPainel } from "@/lib/queries/promotor";
import { PesquisaPopup } from "@/components/pesquisa-popup";
import { Button } from "@/components/ui/button";
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
  const elegivelPromotor = ["pesquisa", "inscricoes", "ativa"].includes(c.status);
  const { data: manifest } = useManifestacaoTotal(c.slug, emPesquisa);
  const { data: painel } = usePromotorPainel(c.slug, elegivelPromotor);
  const total = manifest?.quotas_total ?? 0;
  const quorum = manifest?.quorum ?? c.quorum_quotas ?? 0;
  const pct = quorum > 0 ? Math.min(100, Math.round((total / quorum) * 100)) : 0;
  const prazo = manifest?.prazo
    ? new Date(manifest.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const destaque = c.status !== "rascunho";

  return (
    <div className="space-y-3">
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
      {painel && <PromotorCard competicao={c} painel={painel} />}
    </div>
  );
}

const ERROS_CONVITE: Record<string, string> = {
  email_ja_indicado: "Esse e-mail já foi indicado",
  limite_atingido: "Você atingiu o limite de convites",
  email_invalido: "E-mail inválido",
  competicao_fechada: "As inscrições não estão abertas",
  nao_e_promotor: "Você não é promotor desta competição",
};

function PromotorCard({
  competicao,
  painel,
}: {
  competicao: Competicao;
  painel: NonNullable<ReturnType<typeof usePromotorPainel>["data"]>;
}) {
  const [email, setEmail] = useState("");
  const criarIndicacao = useCriarIndicacao(competicao.slug);

  const copiarLink = async () => {
    const rotaPublica = competicao.slug === "champions2627" ? "/champions" : "/";
    const url = new URL(rotaPublica, window.location.origin);
    url.searchParams.set("ref", painel.codigo);
    if (rotaPublica === "/") url.searchParams.set("comp", competicao.slug);
    await navigator.clipboard.writeText(url.toString());
    toast.success("Link copiado!");
  };

  const convidar = async (event: React.FormEvent) => {
    event.preventDefault();
    const emailLimpo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo) || emailLimpo.length > 255) {
      toast.error("E-mail inválido");
      return;
    }

    try {
      const resultado = await criarIndicacao.mutateAsync(emailLimpo);
      setEmail("");
      if (resultado.ok && resultado.email_enviado) {
        toast.success("Convite enviado por e-mail! 📬");
      } else if (resultado.ok && resultado.aviso === "email_falhou") {
        toast.success("Convite registrado, mas o e-mail falhou — envie seu link direto pra pessoa");
      } else {
        toast.success("Convite registrado. Agora envie seu link para essa pessoa.");
      }
    } catch (error) {
      const codigo = error instanceof Error ? error.message : "";
      toast.error(ERROS_CONVITE[codigo] ?? "Não foi possível registrar o convite");
    }
  };

  return (
    <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-label={`Promoção de ${competicao.nome_curto}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold">Você é promotor da {competicao.nome_curto}</p>
          <p className="text-xs text-muted-foreground">Compartilhe seu link ou registre quem você convidou.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copiarLink}>
          <Copy /> Copiar meu link
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Convidados", painel.convidados],
          ["Cadastrados", painel.cadastrados],
          ["Aderiram", painel.aderiram],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-lg border border-border bg-background p-2">
            <dt className="text-[11px] text-muted-foreground">{rotulo}</dt>
            <dd className="font-display text-lg font-bold">{valor}</dd>
          </div>
        ))}
      </dl>

      {painel.incentivo.tipo !== "nenhum" && (
        <p className="mt-3 text-sm">
          Incentivo acumulado: <strong>{painel.incentivo.valor_acumulado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
        </p>
      )}

      <form onSubmit={convidar} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`email-promotor-${competicao.id}`}>E-mail do convidado</label>
        <input
          id={`email-promotor-${competicao.id}`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={255}
          required
          placeholder="amigo@email.com"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm" disabled={criarIndicacao.isPending}>
          <Mail /> {criarIndicacao.isPending ? "Registrando..." : "Convidar por e-mail"}
        </Button>
      </form>
    </aside>
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
