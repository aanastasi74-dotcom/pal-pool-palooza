import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Lightbulb, Sparkles } from "lucide-react";
import { calcularEngajamento, isElegivelLanterna, razaoNaoElegivel, estaNosUltimos25, ENGAJAMENTO_MIN, PONTOS_MIN } from "@/lib/lanterninha";
import { useProfile, useUpdateProfile } from "@/lib/queries/profiles";
import { useMinhasQuotas, useTotalQuotas } from "@/lib/queries/quotas";
import { Skeleton } from "@/components/ui/skeleton";
import { usePesquisaAtiva, useMinhaParticipacao } from "@/lib/queries/pesquisas";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Bolão dos Perebas" }] }),
  component: Perfil,
});

function Perfil() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [apelido, setApelido] = useState("");
  const [sigla, setSigla] = useState("");
  const [notif, setNotif] = useState<{ email: boolean; antesDeTravar: boolean }>({ email: true, antesDeTravar: true });
  const [recebeLembretesEmail, setRecebeLembretesEmail] = useState(true);

  useEffect(() => {
    if (profile) {
      setApelido(profile.apelido ?? "");
      setSigla(((profile as any).sigla ?? "") as string);
      const n = (profile.notificacoes ?? {}) as Record<string, boolean>;
      setNotif({
        email: n.email ?? true,
        antesDeTravar: n.antesDeTravar ?? true,
      });
      setRecebeLembretesEmail(((profile as any).recebe_lembretes_email ?? true) as boolean);
    }
  }, [profile]);

  if (isLoading || !profile) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pra perebada saber quem é quem.</p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gold font-display text-lg font-bold text-gold-foreground">
            {(sigla || apelido || "??").slice(0, 3).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-xl font-bold">{profile.nome}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {profile.role}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Apelido no bolão</label>
            <input
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-secondary px-4 py-3 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sigla (até 3 letras)</label>
            <input
              value={sigla}
              onChange={(e) => setSigla(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
              maxLength={3}
              placeholder="GPS"
              className="mt-2 w-full rounded-2xl border border-border bg-secondary px-4 py-3 font-display font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Aparece no avatar do ranking.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Notificações</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex flex-col gap-1 rounded-2xl border border-border bg-secondary px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Receber lembretes por email</span>
              <input
                type="checkbox"
                checked={recebeLembretesEmail}
                onChange={(e) => setRecebeLembretesEmail(e.target.checked)}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Lembretes pré-Copa e durante a Copa (na véspera de dias com jogos). Você pode desativar a qualquer momento.
            </p>
          </label>
          {[
            { key: "email", label: "E-mail diário" },
            { key: "antesDeTravar", label: "Avisar 30min antes de travar palpite" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
              <span>{opt.label}</span>
              <input
                type="checkbox"
                checked={(notif as any)[opt.key]}
                onChange={(e) => setNotif({ ...notif, [opt.key]: e.target.checked })}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
      </section>

      <ElegibilidadeLanterna />

      <PesquisaCard />


      <button
        disabled={updateProfile.isPending}
        onClick={() =>
          updateProfile.mutate(
            { apelido, sigla: sigla || null, notificacoes: notif, recebe_lembretes_email: recebeLembretesEmail } as any,
            {
              onSuccess: () => toast.success("Perfil atualizado, pereba!"),
              onError: () => toast.error("Não foi possível salvar agora."),
            },
          )
        }
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        {updateProfile.isPending ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );
}

function ElegibilidadeLanterna() {
  const { data: minhasQuotas = [] } = useMinhasQuotas({ includeEncerradas: true });
  const { data: totalQuotas = 0 } = useTotalQuotas();
  const quotasNoFundo = (minhasQuotas as any[]).filter((q) => estaNosUltimos25(q.posicao ?? 9999, totalQuotas));
  if (quotasNoFundo.length === 0) return null;
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 rotate-180 text-accent-foreground" />
        <h2 className="font-display text-lg font-bold">Elegibilidade ao lanterninha</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        O lanterninha leva 5% do prêmio — mas só pra quem palpitou direito até o fim. Aqui ficam as suas quotas que estão nos 25% finais.
      </p>
      <div className="mt-5 space-y-5">
        {quotasNoFundo.map((q) => {
          const eng = calcularEngajamento(q.palpites_validos ?? 0, q.palpites_possiveis ?? 0);
          const elegivel = isElegivelLanterna(q);
          const razao = razaoNaoElegivel(q);
          return (
            <div key={q.id} className="rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold">Quota #{q.numero} · {q.posicao}º lugar</p>
                {elegivel ? (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    <CheckCircle2 className="h-3 w-3" /> Elegível
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    <AlertCircle className="h-3 w-3" /> Não elegível
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">Engajamento</span>
                  <span className="text-muted-foreground">
                    {q.palpites_validos} de {q.palpites_possiveis} palpites · meta {ENGAJAMENTO_MIN * 100}%
                  </span>
                </div>
                <Progress value={Math.min(100, (eng / ENGAJAMENTO_MIN) * 100)} className="h-2" />
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">Pontuação</span>
                  <span className="text-muted-foreground">
                    {q.pontos} pts · meta {PONTOS_MIN}
                  </span>
                </div>
                <Progress value={Math.min(100, ((q.pontos ?? 0) / PONTOS_MIN) * 100)} className="h-2" />
              </div>

              {!elegivel && razao && (
                <p className="mt-3 text-xs text-muted-foreground">Motivo: {razao}.</p>
              )}
              {elegivel && (
                <p className="mt-3 text-xs text-success">Tudo certo — segue palpitando até o fim.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PesquisaCard() {
  const { data: pesquisa } = usePesquisaAtiva();
  const { data: participacao } = useMinhaParticipacao(pesquisa?.id);
  if (!pesquisa) return null;
  if (participacao?.status === "concluida") return null;
  const encerrada = new Date(pesquisa.encerra_em) < new Date();
  return (
    <section className="rounded-2xl border border-accent/40 bg-accent/5 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="font-display font-bold">{pesquisa.titulo}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {encerrada
              ? "Pesquisa encerrada — obrigado a quem participou."
              : `Ajuda a gente. Prazo: ${new Date(pesquisa.encerra_em).toLocaleDateString("pt-BR")}.`}
          </p>
          {!encerrada && (
            <Link
              to="/app/pesquisa/$slug"
              params={{ slug: pesquisa.slug }}
              className="mt-2 inline-flex rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Responder pesquisa
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
