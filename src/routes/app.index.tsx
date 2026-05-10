import { createFileRoute, Link } from "@tanstack/react-router";
import { times } from "@/lib/mock-data";
import { Sparkles, TrendingUp, Trophy, Pencil, Lightbulb, AlertCircle, CheckCircle2, Newspaper } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { BoletimEditor } from "@/components/boletim-editor";
import { calcularEngajamento, isElegivelLanterna, estaNosUltimos25, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";
import { useProfile } from "@/lib/queries/profiles";
import { useRanking } from "@/lib/queries/profiles";
import { useMatches } from "@/lib/queries/matches";
import { useBulletinDoDia } from "@/lib/queries/bulletins";
import { useMinhasQuotas, useTotalQuotas } from "@/lib/queries/quotas";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Início — Bolão dos Perebas" }] }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: ranking = [] } = useRanking();
  const { data: matches = [] } = useMatches();
  const { data: boletim, isLoading: loadingB } = useBulletinDoDia();
  const { data: minhasQuotas = [] } = useMinhasQuotas();

  const proximos = (matches as any[]).filter((m) => m.status !== "encerrado").slice(0, 3);
  const top3 = (ranking as any[]).slice(0, 3);
  const isAdmin = profile?.role === "admin";

  const minhaMelhor = useMemo(() => {
    if (!user) return null;
    const minhas = (ranking as any[]).filter((r) => r.user_id === user.id);
    if (!minhas.length) return null;
    return minhas.reduce((a, b) => ((a.posicao ?? 9999) <= (b.posicao ?? 9999) ? a : b));
  }, [ranking, user]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [boletimText, setBoletimText] = useState<string>("");
  useEffect(() => {
    if (boletim?.conteudo) setBoletimText(boletim.conteudo);
  }, [boletim]);

  const compartilharWhats = () => {
    const texto = encodeURIComponent(`📰 Boletim dos Perebas\n\n${boletimText}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-glow md:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <p className="text-xs uppercase tracking-widest opacity-80">Sua posição na perebada</p>
        <div className="mt-2 flex items-end gap-4">
          <p className="font-display text-6xl font-black">
            {minhaMelhor?.posicao ? `${minhaMelhor.posicao}º` : "—"}
          </p>
          <div className="pb-2">
            <p className="font-display text-2xl font-bold">{(minhaMelhor?.pontos ?? 0).toLocaleString("pt-BR")} pts</p>
            <p className="text-xs opacity-80">{minhasQuotas.length} quota{minhasQuotas.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Quotas" valor={String(minhasQuotas.length)} />
          <Stat label="Placares exatos" valor="—" />
          <Stat label="Aproveitamento" valor="—" />
        </div>
      </section>

      <LanternaAviso />

      <section>
        <SectionHeader title="Próximos jogos" link="/app/jogos" />
        {proximos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum jogo agendado ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {proximos.map((j) => {
              const tCasa = times[j.casa] ?? { sigla: j.casa, bandeira: "🏳️", nome: j.casa };
              const tFora = times[j.fora] ?? { sigla: j.fora, bandeira: "🏳️", nome: j.fora };
              const dt = new Date(j.data_jogo);
              return (
                <div key={j.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="text-2xl">{tCasa.bandeira}</div>
                    <div className="text-sm font-semibold">{tCasa.sigla}</div>
                    <div className="px-2 text-xs text-muted-foreground">×</div>
                    <div className="text-sm font-semibold">{tFora.sigla}</div>
                    <div className="text-2xl">{tFora.bandeira}</div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{j.fase} · peso {j.peso}</div>
                  <div className="ml-3 text-right">
                    <p className="font-display text-sm font-bold">{dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                    <p className="text-xs text-muted-foreground">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Pódio" link="/app/ranking" />
        {top3.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Pódio ainda vazio. Bora pontuar.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {top3.map((p: any, i: number) => {
              const cor = p.profile?.cor ?? "oklch(0.6 0.16 200)";
              const apelido = p.profile?.apelido ?? "??";
              const nome = p.profile?.nome ?? "—";
              return (
                <div key={p.id} className={`rounded-2xl border p-5 shadow-card ${i === 0 ? "border-accent bg-gold text-gold-foreground" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full font-bold text-white" style={{ background: cor }}>
                      {apelido}
                    </div>
                    <div>
                      <p className="text-xs opacity-70">{i + 1}º lugar</p>
                      <p className="font-display font-bold">{nome}</p>
                    </div>
                    {i === 0 && <Trophy className="ml-auto h-6 w-6" />}
                  </div>
                  <p className="mt-4 font-display text-3xl font-black">{(p.pontos ?? 0).toLocaleString("pt-BR")}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3" /> Quota #{p.numero}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            {loadingB ? (
              <Skeleton className="mt-3 h-16 w-full" />
            ) : boletim ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{boletimText || boletim.conteudo}</p>
                {isAdmin ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={compartilharWhats} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                      Compartilhar no WhatsApp
                    </button>
                    <button onClick={() => setEditorOpen(true)} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
                      <Pencil className="h-3 w-3" /> Editar antes de publicar
                    </button>
                    <Link to="/app/boletins" className="rounded-full border border-border px-4 py-2 text-xs font-bold">
                      Histórico
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">Em modo leitura — só admins publicam.</p>
                )}
              </>
            ) : (
              <div className="mt-3">
                <EmptyState icon={Newspaper} title="Boletim ainda não saiu, peraba" description="Quando sair, aparece aqui." />
              </div>
            )}
          </div>
        </div>
      </section>

      <BoletimEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={boletimText}
        onPublish={(final, original) => {
          setBoletimText(final);
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
              ? "Sua quota tá no fundo, mas elegível ao lanterninha. Mantém o ritmo, peraba."
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
