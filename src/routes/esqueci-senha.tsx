import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Bolão dos Perebas" }] }),
  component: EsqueciSenhaPage,
});

const schema = z.object({ email: z.string().trim().email("E-mail inválido.") });

function EsqueciSenhaPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    await resetPassword(email.trim());
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold">Esqueci minha senha</h1>
          <p className="mt-1 text-xs text-muted-foreground">Te mandamos um link pra redefinir.</p>
        </div>
        {done ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm shadow-card">
            <p>Se o e-mail está cadastrado, te mandamos um link. Confere a caixa de entrada (e o spam, pereba).</p>
            <Link to="/login" className="mt-4 inline-block text-xs font-bold text-primary">
              ← Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <label className="text-xs font-semibold">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar link"}
            </button>
            <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
