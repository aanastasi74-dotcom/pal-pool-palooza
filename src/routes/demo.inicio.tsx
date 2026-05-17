import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoShell } from "@/demo/demo-shell";
import { JOGOS_DEMO, PREMIO_DEMO, getTime } from "@/demo/dados";
import { Coins, CalendarDays, ArrowRight } from "lucide-react";
import { PlacarJogo } from "@/components/placar-jogo";

export const Route = createFileRoute("/demo/inicio")({
  head: () => ({ meta: [{ title: "Tour — Início" }] }),
  component: DemoInicio,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function DemoInicio() {
  const proximos = JOGOS_DEMO.filter((j) => j.status === "agendado").slice(0, 4);
  const recentes = JOGOS_DEMO.filter((j) => j.status === "encerrado").slice(-3).reverse();
  return (
    <DemoShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Olá, Visitante!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Esse é o painel inicial da sua quota no bolão.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-amber-500/10 to-amber-300/5 p-5 shadow-card">
            <div className="flex items-center gap-2 text-amber-600">
              <Coins className="h-5 w-5" /> <p className="text-xs font-bold uppercase tracking-widest">Prêmio total</p>
            </div>
            <p className="mt-3 font-display text-4xl font-black">R$ {PREMIO_DEMO.total_confirmado.toLocaleString("pt-BR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{PREMIO_DEMO.quotas_pagas} quotas confirmadas · meta R$ {PREMIO_DEMO.meta.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sua posição</p>
            <p className="mt-3 font-display text-4xl font-black">7º</p>
            <p className="mt-1 text-xs text-muted-foreground">156 pts · +3 nas últimas rodadas</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Palpites feitos</p>
            <p className="mt-3 font-display text-4xl font-black">8 / 10</p>
            <p className="mt-1 text-xs text-muted-foreground">2 jogos faltando palpitar</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Próximos jogos</h2>
            <Link to="/demo/jogos" className="text-xs font-semibold text-primary hover:underline">Ver todos <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {proximos.map((j) => {
              const tc = getTime(j.casa), tf = getTime(j.fora);
              return (
                <div key={j.numero_jogo} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{j.fase} · peso {j.peso} · {fmt(j.data_jogo)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-display text-sm font-bold"><span className="text-xl">{tc.bandeira}</span>{tc.nome}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="flex items-center gap-2 font-display text-sm font-bold">{tf.nome}<span className="text-xl">{tf.bandeira}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-xl font-bold">Últimos resultados</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {recentes.map((j) => {
              const tc = getTime(j.casa), tf = getTime(j.fora);
              return (
                <div key={j.numero_jogo} className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{j.fase}</p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="text-2xl">{tc.bandeira}</span>
                    <PlacarJogo
                      placar_casa={j.placar_casa ?? null}
                      placar_fora={j.placar_fora ?? null}
                      placar_casa_prorrogacao={j.placar_casa_prorrogacao}
                      placar_fora_prorrogacao={j.placar_fora_prorrogacao}
                      penaltis_casa={j.penaltis_casa}
                      penaltis_fora={j.penaltis_fora}
                      size="sm"
                    />
                    <span className="text-2xl">{tf.bandeira}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{tc.sigla} × {tf.sigla}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
