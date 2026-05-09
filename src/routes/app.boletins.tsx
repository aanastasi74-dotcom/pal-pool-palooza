import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { boletins, currentUser, type Boletim } from "@/lib/mock-data";
import { Pencil, Eye } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/app/boletins")({
  head: () => ({
    meta: [
      { title: "Boletins — Bolão dos Perebas" },
      { name: "description", content: "Histórico de boletins da perebada — pra ninguém ficar de fora da zoeira." },
    ],
  }),
  component: BoletinsPage,
});

function BoletinsPage() {
  const isAdmin = currentUser.role === "admin";
  const [aberto, setAberto] = useState<Boletim | null>(null);

  if (!boletins.length) {
    return <EmptyState title="Nenhum boletim ainda" description="Quando a Copa começar, aparece aqui o primeiro." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tudo que rolou na perebada, dia a dia.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {boletins.map((b) => (
          <article key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{b.data}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "publicado" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {b.status === "publicado" ? "Publicado" : "Rascunho"}
              </span>
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

      {aberto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={() => setAberto(null)}>
          <div className="max-w-lg rounded-3xl border border-border bg-card p-6 shadow-glow" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-muted-foreground">{aberto.data}</p>
            <h3 className="mt-1 font-display text-xl font-bold">{aberto.titulo}</h3>
            <p className="mt-3 whitespace-pre-line text-sm">{aberto.conteudo}</p>
            <button onClick={() => setAberto(null)} className="mt-5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
