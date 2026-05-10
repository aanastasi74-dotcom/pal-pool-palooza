import { createFileRoute, Link } from "@tanstack/react-router";
import { jogos, ranking, times, currentUser, perfis, gerarBoletimMock, minhasQuotas, TOTAL_QUOTAS } from "@/lib/mock-data";
import { Sparkles, TrendingUp, Trophy, Pencil, Lightbulb, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BoletimEditor } from "@/components/boletim-editor";
import { calcularEngajamento, isElegivelLanterna, estaNosUltimos25, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Início — Bolão dos Perebas" }] }),
  component: Home,
});

function Home() {
  const proximos = jogos.filter((j) => j.status !== "encerrado").slice(0, 3);
  const top3 = ranking.slice(0, 3);
  const isAdmin = currentUser.role === "admin";
  const gerado = useMemo(() => gerarBoletimMock(ranking, perfis), []);
  const [boletim, setBoletim] = useState(gerado.conteudo);
  const [editing, setEditing] = useState(false);
  const perfisLidos = useMemo(() => {
    const ids = new Set<string>();
    [...ranking.slice(0, 3), [...ranking].sort((a, b) => b.variacao - a.variacao)[0], [...ranking].sort((a, b) => a.variacao - b.variacao)[0]]
      .forEach((p) => p && ids.add(p.id));
    return perfis.filter((p) => ids.has(p.participante_id)).map((p) => p.apelido_principal);
  }, []);

  const compartilharWhats = () => {
    const texto = encodeURIComponent(`📰 Boletim dos Perebas\n\n${boletim}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <p className="text-xs uppercase tracking-widest opacity-80">Sua posição na perebada</p>
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

      <LanternaAviso />

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
                <div className="grid h-10 w-10 place-items-center rounded-full font-bold text-white" style={{ background: p.cor }}>
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
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Boletim do dia · pra perebada saber</h3>
              {isAdmin && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">admin</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{boletim}</p>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              Perfis lidos: {perfisLidos.length ? perfisLidos.join(" · ") : "ninguém com perfil hoje"}
            </p>
            {isAdmin ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={compartilharWhats} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                  Compartilhar no WhatsApp
                </button>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
                  <Pencil className="h-3 w-3" /> Editar antes de publicar
                </button>
                <Link to="/app/boletins" className="rounded-full border border-border px-4 py-2 text-xs font-bold">
                  Histórico
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Em modo leitura — só admins publicam.</p>
            )}
          </div>
        </div>
      </section>

      <BoletimEditor
        open={editing}
        onOpenChange={setEditing}
        initial={boletim}
        onPublish={(final, original) => {
          setBoletim(final);
          // mock: salvaria { original, final } como exemplo few-shot
          toast.message("Versão original salva pra próxima geração aprender.");
          console.log("[boletim] original:", original, "→ final:", final);
        }}
      />
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

function LanternaAviso() {
  const quotasNoFundo = minhasQuotas.filter((q) => estaNosUltimos25(q.posicao, TOTAL_QUOTAS));
  if (quotasNoFundo.length === 0) return null;
  // pega a "melhor" caso haja várias (menor posição entre as do fundo)
  const q = quotasNoFundo.sort((a, b) => a.posicao - b.posicao)[0];
  const eng = calcularEngajamento(q.palpites_validos, q.palpites_possiveis);
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
              ? "Sua quota tá no fundo, mas elegível ao lanterninha. Mantém o ritmo, peraba."
              : "Sua quota está nos 25% finais. Lanterninha vale 5% do prêmio — mas só pra quem palpitou direito."}
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Criterio
              ok={eng >= ENGAJAMENTO_MIN}
              label={`Palpites válidos: ${q.palpites_validos}/${q.palpites_possiveis} (${(eng * 100).toFixed(0)}%) — mín. ${ENGAJAMENTO_MIN * 100}%`}
            />
            <Criterio
              ok={q.pontos >= PONTOS_MIN}
              label={`Pontuação: ${q.pontos} — mín. ${PONTOS_MIN}`}
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
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium text-foreground/90">{label}</span>
    </div>
  );
}
