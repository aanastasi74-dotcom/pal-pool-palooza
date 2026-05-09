import { createFileRoute } from "@tanstack/react-router";
import { currentUser } from "@/lib/mock-data";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Bolão dos Perebas" }] }),
  component: Perfil,
});

function Perfil() {
  const [apelido, setApelido] = useState(currentUser.apelido);
  const [notif, setNotif] = useState(currentUser.notificacoes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pra perebada saber quem é quem.</p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gold font-display text-xl font-bold text-gold-foreground">
            {apelido.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-xl font-bold">{currentUser.nome}</p>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {currentUser.role}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Apelido no bolão</label>
          <input
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-border bg-secondary px-4 py-3 font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Notificações</h2>
        <div className="mt-4 space-y-3 text-sm">
          {[
            { key: "whatsapp", label: "Lembrete no WhatsApp" },
            { key: "email", label: "E-mail diário" },
            { key: "antesDeTravar", label: "Avisar 30min antes de travar palpite" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
              <span>{opt.label}</span>
              <input
                type="checkbox"
                checked={(notif as any)[opt.key]}
                onChange={(e) => setNotif({ ...notif, [opt.key]: e.target.checked })}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
      </section>

      <button
        onClick={() => toast.success("Perfil atualizado, peraba!")}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
      >
        Salvar alterações
      </button>
    </div>
  );
}
