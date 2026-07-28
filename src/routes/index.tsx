import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import heroImg from "@/assets/hero-bolao.jpg";
import {
  Trophy,
  Users,
  Wallet,
  Sparkles,
  Calendar,
  ListOrdered,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { HomeDestaquesCarousel } from "@/components/home-destaques-carousel";
import { DemoTour } from "@/components/demo-tour";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão dos Perebas — a plataforma de bolões entre amigos" },
      {
        name: "description",
        content:
          "Palpites, ranking automático em tempo real, controle de quotas e uma crônica diária. Uma competição de cada vez, do jeito que o seu grupo quiser.",
      },
      {
        property: "og:title",
        content: "Bolão dos Perebas — a plataforma de bolões entre amigos",
      },
      {
        property: "og:description",
        content:
          "Palpites, ranking em tempo real, controle de quotas e crônica diária. Regras, valores e prêmios configurados a cada competição.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (profile) navigate({ to: "/app", replace: true });
    else navigate({ to: "/completar-perfil", replace: true });
  }, [user, profile, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2 text-primary-foreground">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Bolão dos Perebas</p>
              <p className="text-[10px] uppercase tracking-widest opacity-80">
                Plataforma de bolões
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/demo"
              className="hidden sm:inline-flex rounded-full border border-white/40 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              Ver a demonstração →
            </Link>
            <Link
              to="/app"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-glow transition hover:scale-105"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-20 text-primary-foreground md:pt-36 md:pb-28">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <img
            src={heroImg}
            alt=""
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Entre amigos · por convite ou indicação
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-balance md:text-6xl">
              A plataforma de bolão mais <span className="text-accent">divertida</span> entre amigos.
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/85 md:text-lg">
              Palpite jogo a jogo, jogue com <strong>várias quotas</strong>, acompanhe o ranking mudar ao vivo e leia a crônica do bolão todo dia. As regras, os valores e os prêmios são configurados a cada competição.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-glow transition hover:scale-105"
              >
                Acessar meu bolão
              </Link>
              <Link
                to="/demo"
                className="rounded-full border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Ver a demonstração →
              </Link>
              <a
                href="#como-funciona"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:text-white"
              >
                Como funciona
              </a>
            </div>
            <div className="mt-8">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs uppercase tracking-wide text-white/70">
                <div>
                  <p className="font-display text-2xl font-bold text-white">71</p>
                  perebas
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-white">11.042</p>
                  palpites
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-white">9,79</p>
                  nota da turma
                </div>
              </div>
              <p className="mt-3 text-[11px] text-white/60">
                na primeira competição da plataforma — Copa do Mundo 2026
              </p>
            </div>
          </div>
          <div className="relative">
            <HomeDestaquesCarousel />
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="veja-funcionando" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Demonstração interativa
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">
            Veja a plataforma funcionando — com dados reais da Copa 2026.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            7 passos, dados de verdade. Compre quotas, palpite, acompanhe um jogo virando e veja o ranking se mexer.
          </p>
        </div>
        <div className="mt-10">
          <DemoTour />
        </div>
        <div className="mt-6 text-center">
          <Link
            to="/demo"
            className="inline-flex rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Abrir em tela cheia →
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Tudo num só lugar
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">
            Feito pra deixar o bolão entre amigos moderno e justo.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PONTUAÇÃO — EXEMPLO */}
      <section className="bg-field py-20 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Exemplo: como foi na Copa 2026
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">
              Regras que o seu grupo configura.
            </h2>
            <p className="mt-4 text-white/80">
              Cada competição tem a sua própria configuração. Na Copa do Mundo 2026, por exemplo, o peso das rodadas subiu de 10 na estreia até 50 na final — e o placar exato valia 12 pontos, multiplicados por esse peso.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/90">
              <li>· A pontuação só conta se você acertar o resultado — quem venceu, ou o empate</li>
              <li>· Peso progressivo: as rodadas decisivas valem mais</li>
              <li>· Aposta de longo prazo nos semifinalistas, travada antes da bola rolar</li>
              <li>· Premiação por faixas, proporcional ao tamanho do bolão</li>
            </ul>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pontos.map((p) => (
                <div
                  key={p.label}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:p-5"
                >
                  <p className="font-display text-3xl font-black text-accent">{p.valor}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-white/70">{p.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/70">
              Errou o resultado, zerou. Tudo multiplicado pelo peso da rodada.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-extrabold text-balance md:text-5xl">
          Pronto pra próxima?
        </h2>
        <p className="mt-4 text-muted-foreground">
          A Copa 2026 acabou. A próxima competição já está sendo desenhada — e você pode dizer qual quer que seja.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/app"
            className="inline-flex w-full justify-center rounded-full bg-hero px-8 py-4 font-bold text-primary-foreground shadow-glow transition hover:scale-105 sm:w-auto"
          >
            Entrar no bolão
          </Link>
          <Link
            to="/champions"
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-8 py-4 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto"
          >
            Manifestar interesse na Champions →
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 Bolão dos Perebas · Feito com 💛💚 entre amigos
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: "Acesso controlado",
    desc: "Por convite ou indicação — o grupo decide quem entra. Cada pessoa pode ter várias quotas, e cada quota tem palpites e ranking próprios.",
  },
  {
    icon: Wallet,
    title: "Pix e caixa transparente",
    desc: "Compra de quotas por Pix com comprovante e aprovação. O razão do caixa fica aberto pra todo mundo conferir.",
  },
  {
    icon: Calendar,
    title: "Calendário automático",
    desc: "Importa a tabela da competição e gera as fases eliminatórias sozinho.",
  },
  {
    icon: ListOrdered,
    title: "Ranking em tempo real",
    desc: "Geral, diário, por fase e evolução de posições. Veja quem subiu e quem despencou.",
  },
  {
    icon: ShieldCheck,
    title: "Regras configuráveis",
    desc: "Cada competição define a sua pontuação, o peso das rodadas, os limites de quota e a divisão dos prêmios.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    desc: "Funciona perfeito no celular. Crônica diária escrita sobre o que aconteceu no seu bolão.",
  },
];

const pontos = [
  { valor: "12", label: "Placar exato" },
  { valor: "6", label: "Resultado + diferença de gols" },
  { valor: "5", label: "Resultado + gols de um time" },
  { valor: "4", label: "Só o resultado" },
];
