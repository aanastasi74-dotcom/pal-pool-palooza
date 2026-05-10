import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Eye, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBulletins } from "@/lib/queries/bulletins";
import { useProfile } from "@/lib/queries/profiles";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/boletins")({
  head: () => ({
    meta: [
      { title: "Boletins — Bolão dos Perebas" },
      { name: "description", content: "Histórico de boletins da perebada — pra ninguém ficar de fora da zoeira." },
    ],
  }),
  component: BoletinsPage,
});

type BoletimRow = { id: string; data: string; titulo: string; conteudo: string; status: string };

function BoletinsPage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const { data: boletins = [], isLoading } = useBulletins();
  const [aberto, setAberto] = useState<BoletimRow | null>(null);

  const publicados = (boletins as BoletimRow[]).filter((b) => b.status === "publicado");

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!publicados.length) {
    return <EmptyState icon={Newspaper} title="Nenhum boletim publicado ainda" description="— saiu da forja." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tudo que rolou na perebada, dia a dia.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {publicados.map((b) => (
          <article key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{new Date(b.data).toLocaleDateString("pt-BR")}</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Publicado</span>
            </div>
            <h3 className="mt-2 font-display text-lg font-bold">{b.titulo}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.conteudo}</p>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setAberto(b)} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">
                <Eye className="h-3 w-3" /> Ver completo
              </button>
              {isAdmin && (
                <button className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-w-lg">
          {aberto && (
            <>
              <DialogHeader>
                <p className="text-xs text-muted-foreground">{new Date(aberto.data).toLocaleDateString("pt-BR")}</p>
                <DialogTitle className="font-display text-xl">{aberto.titulo}</DialogTitle>
              </DialogHeader>
              <p className="whitespace-pre-line text-sm">{aberto.conteudo}</p>
              <DialogFooter>
                <button onClick={() => setAberto(null)} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Fechar</button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
