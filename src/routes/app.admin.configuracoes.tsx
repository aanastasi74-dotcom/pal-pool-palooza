import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSettings, useUpdateSetting } from "@/lib/queries/settings";
import { useMaintenanceMode, setReadOnly, setMaintenance, setAutoBackup } from "@/hooks/use-maintenance";
import { Download, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações" }] }),
  component: Configuracoes,
});

const defaultPix = { chave: "", banco: "", titular: "", instrucoes: "", valor_quota: 50 };
const defaultScore = { exato: 12, resultado: 4, gols_vencedor: 2, dif_gols: 2, gols_time: 1 };
const defaultPeso = { inicial: 10, incremento_dia: 1, final: 50 };
const defaultBoletim = { hora_envio: "22:00", auto_geracao: true };

function Configuracoes() {
  const { data: settings } = useSettings();
  const update = useUpdateSetting();
  const flags = useMaintenanceMode();

  const [pix, setPix] = useState<any>(defaultPix);
  const [score, setScore] = useState<any>(defaultScore);
  const [peso, setPeso] = useState<any>(defaultPeso);
  const [boletim, setBoletim] = useState<any>(defaultBoletim);

  useEffect(() => {
    if (!settings) return;
    setPix({ ...defaultPix, ...(settings.pix_config ?? {}) });
    setScore({ ...defaultScore, ...(settings.score_rules ?? {}) });
    setPeso({ ...defaultPeso, ...(settings.peso_progressivo ?? {}) });
    setBoletim({ ...defaultBoletim, ...(settings.boletim_config ?? {}) });
  }, [settings]);

  const salvar = async () => {
    await Promise.all([
      update.mutateAsync({ key: "pix_config", value: pix }),
      update.mutateAsync({ key: "score_rules", value: score }),
      update.mutateAsync({ key: "peso_progressivo", value: peso }),
      update.mutateAsync({ key: "boletim_config", value: boletim }),
    ]);
    toast.success("Configurações salvas, peraba-admin.");
  };

  const snapshot = async () => {
    const tables = ["profiles", "matches", "quotas", "predictions", "top4_predictions", "payments", "bulletins", "personality_profiles", "invites", "settings", "audit_log", "reports"] as const;
    const dump: any = { gerado_em: new Date().toISOString() };
    await Promise.all(tables.map(async (t) => {
      const { data } = await supabase.from(t).select("*");
      dump[t] = data ?? [];
    }));
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perebas-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Snapshot baixado, peraba-admin.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Configurações gerais</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pix, regras de pontuação, Top 4 e boletim.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <Accordion type="multiple" defaultValue={["pix"]}>
          <AccordionItem value="pix">
            <AccordionTrigger>Pix</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <Field label="Chave Pix" value={pix.chave} onChange={(v) => setPix({ ...pix, chave: v })} />
              <Field label="Banco" value={pix.banco} onChange={(v) => setPix({ ...pix, banco: v })} />
              <Field label="Titular" value={pix.titular} onChange={(v) => setPix({ ...pix, titular: v })} />
              <Field label="Valor da quota (R$)" value={String(pix.valor_quota ?? 50)} onChange={(v) => setPix({ ...pix, valor_quota: Number(v) })} type="number" />
              <Field label="Instruções extras" value={pix.instrucoes ?? ""} onChange={(v) => setPix({ ...pix, instrucoes: v })} textarea />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pontuacao">
            <AccordionTrigger>Regras de pontuação</AccordionTrigger>
            <AccordionContent className="grid gap-3 md:grid-cols-2">
              <Field label="Placar exato" value={String(score.exato)} onChange={(v) => setScore({ ...score, exato: Number(v) })} type="number" />
              <Field label="Resultado certo" value={String(score.resultado)} onChange={(v) => setScore({ ...score, resultado: Number(v) })} type="number" />
              <Field label="Gols do vencedor" value={String(score.gols_vencedor)} onChange={(v) => setScore({ ...score, gols_vencedor: Number(v) })} type="number" />
              <Field label="Diferença de gols" value={String(score.dif_gols)} onChange={(v) => setScore({ ...score, dif_gols: Number(v) })} type="number" />
              <Field label="Gols de um time" value={String(score.gols_time)} onChange={(v) => setScore({ ...score, gols_time: Number(v) })} type="number" />
              <Field label="Peso inicial" value={String(peso.inicial)} onChange={(v) => setPeso({ ...peso, inicial: Number(v) })} type="number" />
              <Field label="Incremento por dia" value={String(peso.incremento_dia)} onChange={(v) => setPeso({ ...peso, incremento_dia: Number(v) })} type="number" />
              <Field label="Peso da final" value={String(peso.final)} onChange={(v) => setPeso({ ...peso, final: Number(v) })} type="number" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top4">
            <AccordionTrigger>Top 4 — janelas de eficácia</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5" />
                <p>
                  <b className="text-foreground">Regra fixa do Top 4 (decisão dos admins):</b> antes da Copa = 100% (4.000 pts), fase de grupos = 50% (2.000 pts), Round of 32 = 25% (1.000 pts), a partir das oitavas = bloqueado.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boletim">
            <AccordionTrigger>Boletim</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <Field label="Hora de envio diário" value={boletim.hora_envio} onChange={(v) => setBoletim({ ...boletim, hora_envio: v })} />
              <div className="flex items-center justify-between">
                <span className="text-sm">Geração automática</span>
                <Switch checked={!!boletim.auto_geracao} onCheckedChange={(v) => setBoletim({ ...boletim, auto_geracao: v })} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="backup">
            <AccordionTrigger>Backup e snapshot</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Snapshot manual baixa um JSON com todas as tabelas críticas — cinto de segurança antes de qualquer ação destrutiva.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-xs font-bold">Backup automático</p>
                  <p className="text-[11px] text-muted-foreground">Configuração local, persistida no banco.</p>
                </div>
                <button onClick={snapshot} className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
                  <Download className="h-3.5 w-3.5" /> Snapshot agora
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup automático diário</span>
                <Switch checked={flags.autoBackup} onCheckedChange={(v) => { setAutoBackup(v); toast.success(v ? "Backup automático ativado." : "Backup automático desativado."); }} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="manutencao">
            <AccordionTrigger>Modo manutenção</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Modo somente leitura</p>
                  <p className="text-[11px] text-muted-foreground">Participantes veem o banner e não conseguem enviar palpites/pagamentos.</p>
                </div>
                <Switch checked={flags.readOnly} onCheckedChange={(v) => { setReadOnly(v); toast.success(v ? "Modo somente leitura ON." : "Modo somente leitura OFF."); }} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Modo manutenção total</p>
                  <p className="text-[11px] text-muted-foreground">Redireciona /app/* (exceto admin) para /manutencao.</p>
                </div>
                <Switch checked={flags.maintenance} onCheckedChange={(v) => { setMaintenance(v); toast.success(v ? "Manutenção total ON." : "Manutenção total OFF."); }} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <button onClick={salvar} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow">
        Salvar configurações
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; }) {
  return (
    <div>
      <label className="text-xs font-bold">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      )}
    </div>
  );
}
