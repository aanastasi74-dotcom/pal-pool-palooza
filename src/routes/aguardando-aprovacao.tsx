import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMinhaManifestacaoQuotasPendente } from "@/lib/queries/champions";

export const Route = createFileRoute("/aguardando-aprovacao")({
  head: () => ({ meta: [{ title: "Aguardando aprovação — Bolão dos Perebas" }] }),
  component: AguardandoAprovacao,
});

function AguardandoAprovacao() {
  const { user, signOut } = useAuth();
  const { data: quotas = 0 } = useMinhaManifestacaoQuotasPendente(user?.id);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg space-y-5 px-4 py-16">
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center shadow-card">
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">
            Conta aguardando aprovação
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O Bolão dos Perebas é um grupo fechado de amigos. Sua conta passa por aprovação da
            organização antes de entrar. Você recebe um email assim que for aprovada.
          </p>
          {quotas > 0 && (
            <p className="mt-4 rounded-xl border border-border bg-card p-3 text-sm">
              Sua manifestação de <strong>{quotas} quota{quotas === 1 ? "" : "s"}</strong> no
              Bolão da Champions 2026/27 já está registrada. 🎉
            </p>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => signOut()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
          <Link
            to="/champions"
            className="text-center text-xs text-muted-foreground underline underline-offset-2"
          >
            Voltar pra página da Champions
          </Link>
        </div>
      </main>
    </div>
  );
}
