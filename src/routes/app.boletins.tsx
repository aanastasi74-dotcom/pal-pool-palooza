import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Newspaper, ChevronDown, Share2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useBoletinsL1 } from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownView } from "@/components/markdown-view";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/boletins")({
  head: () => ({
    meta: [
      { title: "Boletins — Bolão dos Perebas" },
      {
        name: "description",
        content: "Histórico de boletins da perebada — pra ninguém ficar de fora da zoeira.",
      },
    ],
  }),
  component: BoletinsPage,
});

const fmtData = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

const fmtDataCurta = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const fmtPublicadoEm = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
};

function BoletinsPage() {
  const { data: boletins, isLoading } = useBoletinsL1();
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const publicados = (boletins ?? []).filter(
    (b) => b.status === "publicado" && b.publicado_md,
  );

  if (!publicados.length) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Nenhum boletim publicado ainda"
        description="— saiu da forja."
      />
    );
  }

  const [maisRecente, ...anteriores] = publicados;
  const pubEm = fmtPublicadoEm(maisRecente.publicado_em);

  const compartilhar = (md: string, data: string) => {
    const cabec = `📰 Boletim do dia ${fmtData(data)}\n\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(cabec + md)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo que rolou na perebada, dia a dia.
        </p>
      </div>

      <article className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Boletim do dia
            </p>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">
              {fmtData(maisRecente.data_referencia)}
            </h2>
            {pubEm && (
              <p className="mt-1 text-xs text-muted-foreground">
                Publicado em {pubEm}
              </p>
            )}
          </div>
          <button
            onClick={() =>
              compartilhar(maisRecente.publicado_md!, maisRecente.data_referencia)
            }
            className="flex shrink-0 items-center gap-1 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-bold text-success"
          >
            <Share2 className="h-3 w-3" /> WhatsApp
          </button>
        </div>
        <div className="mt-6">
          <MarkdownView>{maisRecente.publicado_md!}</MarkdownView>
        </div>
      </article>

      {anteriores.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold">Boletins anteriores</h2>
          <ul className="mt-3 space-y-2">
            {anteriores.map((b) => {
              const aberto = !!expandidos[b.id];
              const preview = (b.publicado_md ?? "")
                .replace(/^#+\s*/gm, "")
                .replace(/\n+/g, " ")
                .slice(0, 80);
              return (
                <li
                  key={b.id}
                  className="rounded-2xl border border-border bg-card shadow-card"
                >
                  <button
                    onClick={() =>
                      setExpandidos((s) => ({ ...s, [b.id]: !s[b.id] }))
                    }
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">
                        Boletim de {fmtDataCurta(b.data_referencia)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {preview}…
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        aberto && "rotate-180",
                      )}
                    />
                  </button>
                  {aberto && (
                    <div className="border-t border-border px-4 pb-5 pt-4">
                      <MarkdownView>{b.publicado_md!}</MarkdownView>
                      <button
                        onClick={() =>
                          compartilhar(b.publicado_md!, b.data_referencia)
                        }
                        className="mt-4 inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-bold text-success"
                      >
                        <Share2 className="h-3 w-3" /> WhatsApp
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
