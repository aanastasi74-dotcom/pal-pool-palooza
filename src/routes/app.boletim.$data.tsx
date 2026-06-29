import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Share2, Newspaper, Sparkles } from "lucide-react";
import { useBoletimPorData, useBoletinsL1 } from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownView } from "@/components/markdown-view";
import { EmptyState } from "@/components/empty-state";

type Search = { tipo?: "regular" | "extraordinario" };

export const Route = createFileRoute("/app/boletim/$data")({
  head: () => ({ meta: [{ title: "Boletim — Bolão dos Perebas" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    tipo: search.tipo === "extraordinario" ? "extraordinario" : undefined,
  }),
  component: BoletimPage,
});

function BoletimPage() {
  const { data } = Route.useParams();
  const { tipo: tipoSearch } = Route.useSearch();
  const tipo = tipoSearch ?? "regular";
  const { data: boletim, isLoading } = useBoletimPorData(data, tipo);
  const { data: todos } = useBoletinsL1();

  const outros = (todos ?? []).filter(
    (b) => b.status === "publicado" && !(b.data_referencia === data && (b.tipo ?? "regular") === tipo),
  );

  if (isLoading) return <Skeleton className="h-64" />;

  if (!boletim || boletim.status !== "publicado" || !boletim.publicado_md) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <EmptyState icon={Newspaper} title="Boletim não disponível" description="Esse boletim ainda não foi publicado." />
      </div>
    );
  }

  const isExtra = boletim.tipo === "extraordinario";
  const dataFmt = new Date(`${boletim.data_referencia}T12:00:00`).toLocaleDateString("pt-BR");
  const tituloHero = isExtra
    ? (boletim.titulo_customizado ?? "Boletim Extraordinário")
    : dataFmt;
  const compartilhar = () => {
    const cabec = isExtra
      ? `✨ ${tituloHero} — ${dataFmt}\n\n`
      : `📰 Boletim do dia ${dataFmt}\n\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(cabec + (boletim.publicado_md ?? ""))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <button
          onClick={compartilhar}
          className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-bold text-success"
        >
          <Share2 className="h-3 w-3" /> Compartilhar no WhatsApp
        </button>
      </div>

      <article className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        {isExtra ? (
          <>
            <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-accent">
              <Sparkles className="h-3 w-3" /> Boletim Extraordinário · {dataFmt}
            </p>
            <h1 className="font-display text-2xl font-extrabold md:text-3xl">{tituloHero}</h1>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Boletim do dia</p>
            <h1 className="font-display text-2xl font-extrabold md:text-3xl">{dataFmt}</h1>
          </>
        )}
        <div className="mt-6">
          <MarkdownView>{boletim.publicado_md}</MarkdownView>
        </div>
      </article>

      {outros.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold">Outros boletins</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {outros.slice(0, 12).map((b) => {
              const extra = b.tipo === "extraordinario";
              return (
                <li key={b.id}>
                  <Link
                    to="/app/boletim/$data"
                    params={{ data: b.data_referencia }}
                    search={extra ? { tipo: "extraordinario" } : { tipo: undefined }}
                    className="block rounded-xl border border-border bg-card p-3 text-sm hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {new Date(`${b.data_referencia}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                      {extra && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          ✨ EXTRA
                        </span>
                      )}
                    </div>
                    {extra && b.titulo_customizado && (
                      <p className="mt-1 line-clamp-1 text-xs font-bold">{b.titulo_customizado}</p>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {(b.publicado_md ?? "").slice(0, 120)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
