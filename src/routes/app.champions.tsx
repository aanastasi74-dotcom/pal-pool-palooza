import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useChampionsTotal,
  useMinhaManifestacao,
  useUpsertManifestacao,
} from "@/lib/queries/champions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/champions")({
  head: () => ({
    meta: [
      { title: "Champions 2026/27 — Bolão dos Perebas" },
      {
        name: "description",
        content: "Manifeste seu interesse no Bolão da Champions League 2026/27.",
      },
    ],
  }),
  component: ChampionsPage,
});

function ChampionsPage() {
  const { data: total, isLoading: loadingTotal } = useChampionsTotal();
  const { data: minha, isLoading: loadingMinha } = useMinhaManifestacao();
  const upsert = useUpsertManifestacao();
  const [sel, setSel] = useState<number>(0);

  useEffect(() => {
    if (minha?.quotas != null) setSel(minha.quotas);
  }, [minha?.quotas]);

  const prazo = total?.prazo ? new Date(total.prazo) : null;
  const prazoEncerrado = prazo ? new Date() > prazo : false;
  const prazoFmt = prazo
    ? prazo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "07/08";

  const quorum = total?.quorum ?? 35;
  const quotasTotal = total?.quotas_total ?? 0;
  const perebas = total?.perebas ?? 0;
  const pct = Math.min(100, Math.round((quotasTotal / quorum) * 100));

  const confirmar = async () => {
    try {
      await upsert.mutateAsync(sel);
      toast.success(`Registrado: ${sel} quota${sel === 1 ? "" : "s"} — você pode mudar até ${prazoFmt}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao registrar manifestação.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight">
              Bolão da Champions 2026/27 — bora?
            </h1>
            <p className="text-xs uppercase tracking-widest text-primary">manifestação de interesse</p>
          </div>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">O que é</h2>
        <p className="text-sm text-muted-foreground">
          Um bolão da UEFA Champions League 2026/27 no mesmo espírito da Copa: palpite jogo a jogo,
          ranking dinâmico, boletim do cronista e prêmio no fim.
        </p>
        <h2 className="font-display text-lg font-bold pt-2">Como funciona</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Cada pereba pode comprar até 5 quotas.</li>
          <li>Palpites por jogo desde a fase de liga até a final.</li>
          <li>Top 4 do mata-mata pra apimentar.</li>
        </ul>
        <h2 className="font-display text-lg font-bold pt-2">Quanto custa</h2>
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="font-bold">R$ 70 por quota</p>
          <p className="text-muted-foreground">
            R$ 50 vai pro <strong>pote de prêmio</strong> e R$ 20 cobre <strong>custos de infra</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            A infra do bolão (banco de dados, edge functions, envio de emails, provedor de placares
            ao vivo) custa entre <strong>US$ 14 e US$ 30/mês</strong> dependendo do volume. Os R$ 20
            por quota bancam o ano inteiro sem apertar ninguém no bolso.
          </p>
        </div>
        <h2 className="font-display text-lg font-bold pt-2">Condição pra rolar</h2>
        <p className="text-sm text-muted-foreground">
          Precisamos de <strong>{quorum} quotas manifestadas até {prazoFmt}</strong>. Se não bater
          quórum, a gente devolve tudo e vida que segue.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Termômetro público</h2>
        {loadingTotal ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <p className="text-sm">
              Já temos <strong>{quotasTotal} quotas</strong> manifestadas ({perebas} pereba
              {perebas === 1 ? "" : "s"} participando).
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

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div>
          <h2 className="font-display text-lg font-bold">Sua manifestação</h2>
          <p className="text-xs text-muted-foreground">
            {prazoEncerrado
              ? `O prazo encerrou em ${prazoFmt}.`
              : `Escolha quantas quotas você toparia. Dá pra mudar até ${prazoFmt}.`}
          </p>
        </div>
        {loadingMinha ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => {
              const ativo = sel === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={prazoEncerrado}
                  onClick={() => setSel(n)}
                  className={`grid h-14 w-14 place-items-center rounded-xl border text-lg font-bold transition-colors ${
                    ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  } ${prazoEncerrado ? "opacity-50" : ""}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}
        {minha && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Última manifestação: <strong>{minha.quotas}</strong> quota{minha.quotas === 1 ? "" : "s"} em{" "}
            {new Date(minha.atualizado_em).toLocaleString("pt-BR")}
          </p>
        )}
        {!prazoEncerrado && (
          <button
            type="button"
            onClick={confirmar}
            disabled={upsert.isPending}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {upsert.isPending ? "Salvando..." : "Confirmar interesse"}
          </button>
        )}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Isso é só uma manifestação de interesse — nada é cobrado agora. Cobrança e regras
          detalhadas só se o quórum bater.
        </p>
      </section>
    </div>
  );
}
