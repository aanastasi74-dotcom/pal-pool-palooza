import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import * as mock from "@/lib/mock-data";
import { useMaintenanceMode, setReadOnly, setMaintenance, setAutoBackup } from "@/hooks/use-maintenance";
import { Download } from "lucide-react";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const [autoBoletim, setAutoBoletim] = useState(true);

  const flags = useMaintenanceMode();
  const readOnly = flags.readOnly;
  const maintenance = flags.maintenance;
  const autoBackup = flags.autoBackup;

  const salvar = () => toast.success("Configurações salvas, peraba-admin.");

  const snapshot = () => {
    const dump = {
      gerado_em: new Date().toISOString(),
      times: mock.times,
      jogos: mock.jogos,
      ranking: mock.ranking,
      premio: mock.premio,
      perfis: mock.perfis,
      boletins: mock.boletins,
      pagamentos: mock.pagamentosAdmin,
      convites: mock.convites,
      usuarios: mock.usuariosAdmin,
      auditoria: mock.auditoria,
      premiacao: mock.premiacaoConfig,
    };
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
              <Field label="Chave Pix" defaultValue="bolaodosperebas@pix.com" />
              <Field label="Banco" defaultValue="Banco da Perebada (777)" />
              <Field label="Titular" defaultValue="Bolão dos Perebas" />
              <Field label="Instruções extras" defaultValue="Mande o comprovante no app, não no WhatsApp." textarea />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pontuacao">
            <AccordionTrigger>Regras de pontuação</AccordionTrigger>
            <AccordionContent className="grid gap-3 md:grid-cols-2">
              <Field label="Placar exato" defaultValue="12" type="number" />
              <Field label="Resultado certo" defaultValue="4" type="number" />
              <Field label="Gols do vencedor" defaultValue="2" type="number" />
              <Field label="Diferença de gols" defaultValue="2" type="number" />
              <Field label="Gols de um time" defaultValue="1" type="number" />
              <Field label="Peso inicial" defaultValue="10" type="number" />
              <Field label="Incremento por dia" defaultValue="1" type="number" />
              <Field label="Peso da final" defaultValue="50" type="number" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top4">
            <AccordionTrigger>Top 4 — janelas de eficácia</AccordionTrigger>
            <AccordionContent className="grid gap-3 md:grid-cols-2">
              <Field label="Antes da Copa (%)" defaultValue="100" type="number" />
              <Field label="Fase de grupos (%)" defaultValue="50" type="number" />
              <Field label="Oitavas (%)" defaultValue="25" type="number" />
              <Field label="Quartas (%)" defaultValue="12.5" type="number" />
              <Field label="Semis (%)" defaultValue="6.25" type="number" />
              <Field label="Final (%)" defaultValue="0" type="number" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boletim">
            <AccordionTrigger>Boletim</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <Field label="Hora de envio diário" defaultValue="22:00" />
              <div className="flex items-center justify-between">
                <span className="text-sm">Geração automática</span>
                <Switch checked={autoBoletim} onCheckedChange={setAutoBoletim} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="backup">
            <AccordionTrigger>Backup e snapshot</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Em produção, um cron job diário exporta as tabelas críticas para um repositório paralelo
                (Supabase PITR ou GitHub privado). O snapshot manual fica como cinto de segurança antes
                de qualquer ação destrutiva.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-xs font-bold">Último backup automático</p>
                  <p className="text-[11px] text-muted-foreground">12/06/2026 03:00 · retenção 30 dias</p>
                </div>
                <button onClick={snapshot} className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
                  <Download className="h-3.5 w-3.5" /> Snapshot agora
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup automático diário</span>
                <Switch checked={autoBackup} onCheckedChange={(v) => { setAutoBackup(v); toast.success(v ? "Backup automático ativado." : "Backup automático desativado."); }} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="manutencao">
            <AccordionTrigger>Modo manutenção</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Modo somente leitura</p>
                  <p className="text-[11px] text-muted-foreground">Participantes veem o banner e não conseguem enviar palpites/pagamentos. Admin segue operando.</p>
                </div>
                <Switch checked={readOnly} onCheckedChange={(v) => { setReadOnly(v); toast.success(v ? "Modo somente leitura ON." : "Modo somente leitura OFF."); }} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Modo manutenção total</p>
                  <p className="text-[11px] text-muted-foreground">Redireciona /app/* (exceto admin) para /manutencao.</p>
                </div>
                <Switch checked={maintenance} onCheckedChange={(v) => { setMaintenance(v); toast.success(v ? "Manutenção total ON." : "Manutenção total OFF."); }} />
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

function Field({ label, defaultValue, type = "text", textarea }: { label: string; defaultValue: string; type?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold">{label}</label>
      {textarea ? (
        <textarea defaultValue={defaultValue} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      ) : (
        <input type={type} defaultValue={defaultValue} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      )}
    </div>
  );
}
