import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-bolao.jpg";
import { Trophy, Users, Wallet, Sparkles, Calendar, ListOrdered, ShieldCheck, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão dos Perebas — Copa do Mundo 2026" },
      { name: "description", content: "Bolão privado da Copa 2026 entre amigos: palpites, ranking automático, controle de quotas e muita zoeira." },
      { property: "og:title", content: "Bolão dos Perebas — Copa 2026" },
      { property: "og:description", content: "Palpite, acompanhe o ranking e dispute com a galera durante toda a Copa do Mundo 2026." },
    ],
  }),
  component: Landing,
});

function Landing() {
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
              <p className="text-[10px] uppercase tracking-widest opacity-80">Copa 2026</p>
            </div>
          </div>
          <Link
            to="/app"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-glow transition hover:scale-105"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-20 text-primary-foreground md:pt-36 md:pb-28">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="" width={1536} height={1024} className="h-full w-full object-cover" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Convite-only · Entre amigos
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-balance md:text-6xl">
              O bolão mais <span className="text-accent">divertido</span> da Copa do Mundo 2026.
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/85 md:text-lg">
              Palpite jogo a jogo, compre quantas quotas quiser e dispute o topo do ranking com a galera. Pontuação avançada, peso progressivo e até simulador da Copa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-glow transition hover:scale-105"
              >
                Acessar meu bolão
              </Link>
              <a
                href="#como-funciona"
                className="rounded-full border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Como funciona
              </a>
            </div>
            <div className="mt-8 flex gap-6 text-xs uppercase tracking-widest text-white/70">
              <div><p className="font-display text-2xl font-bold text-white">R$ 50</p>por quota</div>
              <div><p className="font-display text-2xl font-bold text-white">104</p>jogos</div>
              <div><p className="font-display text-2xl font-bold text-white">∞</p>quotas / pessoa</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-white/10 blur-2xl" />
            <div className="relative rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl shadow-glow">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/70">
                <span>Próximo jogo</span>
                <span className="flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  AO VIVO
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <TeamBadge flag="🇧🇷" name="Brasil" />
                <div className="text-center">
                  <p className="font-display text-4xl font-black">2 - 0</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-white/60">2º tempo · 67'</p>
                </div>
                <TeamBadge flag="🇵🇹" name="Portugal" right />
              </div>
              <div className="mt-5 rounded-2xl bg-black/25 p-4">
                <p className="text-xs text-white/70">Seu palpite</p>
                <p className="mt-1 font-display text-lg font-bold">3 × 1 · peso 12</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Resultado correto garantido (+48 pts)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Tudo num só lugar</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">
            Feito pra deixar o bolão dos Perebas moderno e justo.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-3xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PONTUAÇÃO */}
      <section className="bg-field py-20 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Sistema de pontuação</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">
              Peso progressivo: cada rodada vale mais.
            </h2>
            <p className="mt-4 text-white/80">
              Do dia 1 (peso 10) até a Final (peso 50). Acertou na mosca? <span className="font-bold text-accent">Placar exato vale 12 pontos</span> e ainda multiplica pelo peso da rodada.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/90">
              <li>· Palpite trava 5 minutos antes da partida</li>
              <li>· Bônus de até 4.000 pts pelos 4 primeiros colocados da Copa</li>
              <li>· Ranking geral, diário e por fase atualizados em tempo real</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pontos.map((p) => (
              <div key={p.label} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="font-display text-3xl font-black text-accent">{p.valor}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/70">{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-extrabold text-balance md:text-5xl">
          Pronto pra entrar na disputa?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Acesse seu painel, confira seus palpites e acompanhe o ranking ao vivo.
        </p>
        <Link
          to="/app"
          className="mt-8 inline-flex rounded-full bg-hero px-8 py-4 font-bold text-primary-foreground shadow-glow transition hover:scale-105"
        >
          Entrar no bolão
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 Bolão dos Perebas · Feito com 💛💚 pra Copa do Mundo
      </footer>
    </div>
  );
}

function TeamBadge({ flag, name, right }: { flag: string; name: string; right?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${right ? "text-right" : ""}`}>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-glow">{flag}</div>
      <p className="text-sm font-bold">{name}</p>
    </div>
  );
}

const features = [
  { icon: Users, title: "Acesso por convite", desc: "Site privado: só entra quem é dos Perebas. Múltiplas quotas por pessoa, cada uma com palpites e ranking próprios." },
  { icon: Wallet, title: "Pix integrado", desc: "Quota a R$ 50 com QR Code, comprovante e aprovação manual pelos administradores." },
  { icon: Calendar, title: "Jogos automáticos", desc: "Importação por CSV, fases gerais geradas sozinhas — oitavas, quartas, semis e final." },
  { icon: ListOrdered, title: "Ranking em tempo real", desc: "Geral, diário, por fase e evolução de posições. Veja quem subiu e quem despencou." },
  { icon: ShieldCheck, title: "Pontuação justa", desc: "Placar exato, resultado, gols do vencedor, diferença e gols por time. Tudo com peso progressivo." },
  { icon: Smartphone, title: "Mobile-first", desc: "Funciona perfeito no celular. Boletins divertidos diários direto pro grupo do WhatsApp." },
];

const pontos = [
  { valor: "12", label: "Placar exato" },
  { valor: "4", label: "Resultado certo" },
  { valor: "2", label: "Gols do vencedor" },
  { valor: "2", label: "Diferença de gols" },
];
