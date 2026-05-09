import { createFileRoute, Link } from "@tanstack/react-router";
import { jogos, ranking, times } from "@/lib/mock-data";
import { ArrowUp, ArrowDown, Minus, Sparkles, TrendingUp, Trophy } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Início — Bolão da Galera" }] }),
  component: Home,
});

function Home() {
  const proximos = jogos.filter((j) => j.status !== "encerrado").slice(0, 3);
  const top3 = ranking.slice(0, 3);
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <p className="text-xs uppercase tracking-widest opacity-80">Sua posição</p>
        <div className="mt-2 flex items-end gap-4">
          <p className="font-display text-6xl font-black">2º</p>
          <div className="pb-2">
            <p className="font-display text-2xl font-bold">1.720 pts</p>
            <p className="text-xs opacity-80">+1 posição esta semana</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Quotas" valor="2" />
          <Stat label="Placares exatos" valor="6" />
          <Stat label="Aproveitamento" valor="68%" />
        </div>
      </section>

      <section>
        <SectionHeader title="Próximos jogos" link="/app/jogos" />
        <div className="mt-4 space-y-3">
          {proximos.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-1 items-center gap-3">
                <div className="text-2xl">{times[j.casa].bandeira}</div>
                <div className="text-sm font-semibold">{times[j.casa].sigla}</div>
                <div className="px-2 text-xs text-muted-foreground">×</div>
                <div className="text-sm font-semibold">{times[j.fora].sigla}</div>
                <div className="text-2xl">{times[j.fora].bandeira}</div>
              </div>
              <div className="hidden text-xs text-muted-foreground sm:block">{j.fase} · peso {j.peso}</div>
              <div className="ml-3 text-right">
                <p className="font-display text-sm font-bold">{j.data}</p>
                <p className="text-xs text-muted-foreground">{j.hora}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Pódio" link="/app/ranking" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {top3.map((p, i) => (
            <div key={p.id} className={`rounded-2xl border p-5 shadow-card ${i === 0 ? "border-accent bg-gold text-gold-foreground" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full font-bold" style={{ background: p.cor, color: "#fff" }}>
                  {p.apelido}
                </div>
                <div>
                  <p className="text-xs opacity-70">{i + 1}º lugar</p>
                  <p className="font-display font-bold">{p.nome}</p>
                </div>
                {i === 0 && <Trophy className="ml-auto h-6 w-6" />}
              </div>
              <p className="mt-4 font-display text-3xl font-black">{p.pontos.toLocaleString("pt-BR")}</p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3" /> {p.exatos} placares exatos
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Boletim do dia</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              "Carla disparou na liderança após cravar o placar de Brasil x Portugal. Rafael caiu duas posições e já promete revanche. Diego segue investindo em quotas — agora são 4!"
            </p>
            <button className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Compartilhar no WhatsApp</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <p className="font-display text-xl font-bold">{valor}</p>
      <p className="text-[10px] uppercase tracking-widest opacity-80">{label}</p>
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

// helpers re-export para evitar warnings
export { ArrowUp, ArrowDown, Minus };
