import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/cadastro-nao-aprovado")({
  head: () => ({ meta: [{ title: "Cadastro não aprovado — Bolão dos Perebas" }] }),
  component: CadastroNaoAprovado,
});

function CadastroNaoAprovado() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Auto-logout após 5s pra evitar loop de gate
    const t = setTimeout(() => {
      signOut();
    }, 5000);
    return () => clearTimeout(t);
  }, [signOut]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg space-y-5 px-4 py-16">
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-card">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">
            Cadastro não aprovado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O Bolão dos Perebas é um grupo fechado de amigos. Sua conta não foi aprovada pela
            organização desta vez. Fale com o pereba que te indicou pra entender.
          </p>
        </section>

        <button
          onClick={() => signOut()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Sair agora
        </button>
      </main>
    </div>
  );
}
