import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trophy, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCheckApelido } from "@/lib/queries/public-profile";
import { translatePgError } from "@/lib/error-messages";

export const Route = createFileRoute("/completar-perfil")({
  head: () => ({ meta: [{ title: "Complete seu perfil — Bolão dos Perebas" }] }),
  component: CompletePerfil,
});

const PALETA = ["#16A34A", "#DC2626", "#2563EB", "#F59E0B", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

function CompletePerfil() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [sigla, setSigla] = useState("");
  const [siglaTouched, setSiglaTouched] = useState(false);
  const [cor, setCor] = useState(PALETA[0]);
  const [submitting, setSubmitting] = useState(false);
  const [aceitouRegulamento, setAceitouRegulamento] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: disponivel, isFetching } = useCheckApelido(apelido);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile) {
      navigate({ to: "/app" });
      return;
    }
    const fallbackNome = user.user_metadata?.nome ?? user.email?.split("@")[0] ?? "";
    const fallbackApelido = (user.user_metadata?.apelido ?? fallbackNome.slice(0, 2) ?? "").toUpperCase();
    setNome(fallbackNome);
    setApelido(fallbackApelido);
  }, [user, profile, isLoading, navigate]);

  // Auto-suggest sigla a partir do nome (debounced) enquanto pereba não digitou
  useEffect(() => {
    if (siglaTouched) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const target = nome.trim();
      if (!target) { setSigla(""); return; }
      const { data } = await (supabase as any).rpc("compute_default_sigla", { p_nome: target });
      setSigla((data ?? "") as string);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [nome, siglaTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (nome.trim().length < 2) return toast.error("Informa um nome.");
    if (apelido.trim().length < 2) return toast.error("Apelido tem que ter pelo menos 2 letras.");
    if (sigla.trim().length < 1) return toast.error("Escolha uma sigla de até 3 letras.");
    if (disponivel === false) return toast.error("Esse apelido já está em uso.");
    if (!aceitouRegulamento) return toast.error("Você precisa aceitar o regulamento pra continuar.");
    setSubmitting(true);
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email!,
      nome: nome.trim(),
      apelido: apelido.trim().toUpperCase(),
      sigla: sigla.trim().toUpperCase(),
      cor,
    } as any);
    if (error) {
      setSubmitting(false);
      toast.error(translatePgError(error));
      return;
    }
    // Registra aceite do regulamento
    const { error: aceiteErr } = await supabase.rpc("aceitar_regras" as any);
    if (aceiteErr) {
      console.error("aceitar_regras:", aceiteErr);
    }
    // Dispara email de boas-vindas (best-effort)
    supabase.functions
      .invoke("send-regras-signup", { body: {} })
      .catch((e) => console.error("send-regras-signup:", e));
    setSubmitting(false);
    toast.success("Perfil criado, pereba!");
    window.location.href = "/app";
  };

  if (isLoading || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-hero shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Complete seu perfil</h1>
          <p className="text-xs text-muted-foreground">Falta pouco pra entrar na perebada.</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <label className="text-xs font-semibold">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
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
              <p className="mt-1 text-xs text-destructive">Esse apelido já está em uso.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold">Sigla (até 3 letras)</label>
            <input
              value={sigla}
              onChange={(e) => {
                setSiglaTouched(true);
                setSigla(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3));
              }}
              maxLength={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase tracking-widest"
              placeholder="GPS"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Use até 3 letras pro seu avatar no ranking.</p>
          </div>
          <div>
            <label className="text-xs font-semibold">Sua cor</label>
            <div className="mt-2 grid grid-cols-8 gap-2">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={aceitouRegulamento}
                onChange={(e) => setAceitouRegulamento(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                Li e aceito o{" "}
                <a
                  href="/regras"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline"
                >
                  regulamento do bolão
                </a>{" "}
                na íntegra.
              </span>
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting || isFetching || disponivel === false || !aceitouRegulamento}
            className="w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Criando…" : "Concluir cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
