import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Bolão dos Perebas" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informa a senha."),
});

function LoginPage() {
  const { signIn, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session) navigate({ to: "/app" });
  }, [isLoading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error("E-mail ou senha incorretos. Tenta de novo, pereba.");
      return;
    }
    navigate({ to: "/app" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-hero shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Bolão dos Perebas</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Copa 2026</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <label className="text-xs font-semibold">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
          <Link to="/esqueci-senha" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            Esqueci minha senha
          </Link>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Sem convite ainda? Pede para um admin do bolão te chamar.
        </p>
        <Link to="/demo" className="block text-center text-xs font-semibold text-primary hover:underline">
          Ainda sem convite? Conheça o app →
        </Link>
      </div>
    </div>
  );
}
