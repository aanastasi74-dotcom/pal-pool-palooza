import { createFileRoute } from "@tanstack/react-router";
import { useStadiums } from "@/lib/queries/stadiums";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/app/estadios")({
  head: () => ({ meta: [{ title: "Estádios — Bolão dos Perebas" }] }),
  component: EstadiosPage,
});

const BANDEIRA: Record<string, string> = { EUA: "🇺🇸", "Canadá": "🇨🇦", "México": "🇲🇽" };

function EstadiosPage() {
  const { data = [], isLoading } = useStadiums();
  const porPais: Record<string, typeof data> = {} as any;
  for (const s of data) (porPais[s.pais] ||= [] as any).push(s);
  const paises = Object.keys(porPais).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Estádios da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">16 sedes em 3 países.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        <EmptyState icon={Building2} title="Estádios ainda não cadastrados" description="O admin vai semear a lista oficial em breve." />
      ) : (
        <div className="space-y-6">
          {paises.map((p) => (
            <section key={p}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
                <span className="text-xl">{BANDEIRA[p] ?? "🏟️"}</span>{p}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {porPais[p].map((s) => (
                  <article key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <p className="font-display font-bold">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{s.cidade} · {s.fuso_horario}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
