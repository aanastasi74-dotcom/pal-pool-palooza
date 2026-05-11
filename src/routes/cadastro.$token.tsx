import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trophy, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCheckApelido } from "@/lib/queries/public-profile";

export const Route = createFileRoute("/cadastro/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite — Bolão dos Perebas" }] }),
  component: CadastroPage,
});

interface InviteRow {
  id: string;
  email: string;
  nome: string;
  status: string;
  expira_em: string;
  mensagem: string | null;
}

const schema = z
  .object({
    nome: z.string().trim().min(2, "Nome muito curto."),
    apelido: z.string().trim().min(1, "Informa um apelido.").max(8, "Apelido até 8 caracteres."),
    password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Senhas não conferem.", path: ["confirm"] });

function CadastroPage() {
  const { token } = useParams({ from: "/cadastro/$token" });
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apelidoStatus, setApelidoStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
      if (error) {
        console.error(error);
      }
      const row = (data && data[0]) as InviteRow | undefined;
      if (row) {
        setInvite(row);
        setNome(row.nome);
        setApelido(row.nome.slice(0, 2).toUpperCase());
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    const parsed = schema.safeParse({ nome, apelido, password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(invite.email, password, nome.trim(), apelido.trim().toUpperCase(), token);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Bem-vindo ao bolão!");
    navigate({ to: "/app" });
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!invite) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="font-display text-2xl font-extrabold">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">
            Esse convite já não vale mais, peraba. Pede outro pro admin.
          </p>
          <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-hero shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Boas-vindas, {invite.nome.split(" ")[0]}!</h1>
          <p className="text-xs text-muted-foreground">Cria sua senha pra entrar no bolão.</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <label className="text-xs font-semibold">E-mail</label>
            <input
              value={invite.email}
              readOnly
              className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <ApelidoField apelido={apelido} setApelido={setApelido} onStatus={setApelidoStatus} />
          <div>
            <label className="text-xs font-semibold">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Confirmar senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || apelidoStatus === "checking" || apelidoStatus === "taken"}
            className="w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Criando…" : "Entrar no bolão"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ApelidoField({
  apelido,
  setApelido,
  onStatus,
}: {
  apelido: string;
  setApelido: (v: string) => void;
  onStatus: (s: "idle" | "checking" | "ok" | "taken") => void;
}) {
  const { data: disponivel, isFetching } = useCheckApelido(apelido);
  useEffect(() => {
    if (apelido.trim().length < 2) onStatus("idle");
    else if (isFetching) onStatus("checking");
    else if (disponivel === true) onStatus("ok");
    else if (disponivel === false) onStatus("taken");
  }, [apelido, isFetching, disponivel, onStatus]);

  return (
    <div>
      <label className="text-xs font-semibold">Apelido (até 8 letras)</label>
      <div className="relative">
        <input
          value={apelido}
          onChange={(e) => setApelido(e.target.value.toUpperCase())}
          maxLength={8}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {apelido.trim().length >= 2 && isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isFetching && disponivel === true && <Check className="h-4 w-4 text-success" />}
          {!isFetching && disponivel === false && <X className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      {!isFetching && disponivel === false && (
        <p className="mt-1 text-xs text-destructive">Esse apelido já está em uso, escolhe outro.</p>
      )}
    </div>
  );
}
