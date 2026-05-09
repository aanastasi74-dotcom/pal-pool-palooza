import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const [autoBoletim, setAutoBoletim] = useState(true);

  const salvar = () => toast.success("Configurações salvas, peraba-admin.");

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
              <Field label="Placar exato" defaultValue="100" type="number" />
              <Field label="Resultado certo" defaultValue="50" type="number" />
              <Field label="Gols do vencedor" defaultValue="20" type="number" />
              <Field label="Diferença de gols" defaultValue="15" type="number" />
              <Field label="Gols de um time" defaultValue="10" type="number" />
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
