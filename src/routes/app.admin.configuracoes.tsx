import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import * as mock from "@/lib/mock-data";
import { auditoria } from "@/lib/mock-data";
import { useMaintenanceMode, setReadOnly, setMaintenance, setAutoBackup } from "@/hooks/use-maintenance";
import { Download } from "lucide-react";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações" }] }),
  component: Configuracoes,
});

const STORAGE_KEY = "perebas:config";

const defaults = {
  pixKey: "bolaodosperebas@pix.com",
  pixBanco: "Banco da Perebada (777)",
  pixTitular: "Bolão dos Perebas",
  pixInstrucoes: "Mande o comprovante no app, não no WhatsApp.",
  ptExato: "12",
  ptResultado: "4",
  ptGolsVencedor: "2",
  ptDifGols: "2",
  ptGolsTime: "1",
  pesoInicial: "10",
  incrementoDia: "1",
  pesoFinal: "50",
  top4Antes: "100",
  top4Grupos: "50",
  top4Oitavas: "25",
  top4PosOitavas: "0",
  boletimHora: "22:00",
  autoBoletim: true,
};

type Cfg = typeof defaults;

function Configuracoes() {
  const [cfg, setCfg] = useState<Cfg>(defaults);
  const [original, setOriginal] = useState<Cfg>(defaults);

  const flags = useMaintenanceMode();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = { ...defaults, ...JSON.parse(raw) } as Cfg;
        setCfg(saved);
        setOriginal(saved);
      }
    } catch {
      /* noop */
    }
  }, []);

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const salvar = () => {
    const alterados = (Object.keys(cfg) as (keyof Cfg)[]).filter((k) => cfg[k] !== original[k]).length;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch { /* noop */ }
    auditoria.unshift({
      id: `a${Date.now()}`,
      ator: "Você",
      acao: "atualizou_configuracoes",
      entidade: "config",
      entidade_id: "geral",
      payload: { campos_alterados: alterados },
      data: new Date().toLocaleString("pt-BR"),
    });
    setOriginal(cfg);
    toast.success(`${alterados} campo(s) atualizado(s), peraba-admin.`);
  };

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
      config: cfg,
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
              <Field label="Chave Pix" value={cfg.pixKey} onChange={(v) => set("pixKey", v)} />
              <Field label="Banco" value={cfg.pixBanco} onChange={(v) => set("pixBanco", v)} />
              <Field label="Titular" value={cfg.pixTitular} onChange={(v) => set("pixTitular", v)} />
              <Field label="Instruções extras" value={cfg.pixInstrucoes} onChange={(v) => set("pixInstrucoes", v)} textarea />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pontuacao">
            <AccordionTrigger>Regras de pontuação</AccordionTrigger>
            <AccordionContent className="grid gap-3 md:grid-cols-2">
              <Field label="Placar exato" value={cfg.ptExato} onChange={(v) => set("ptExato", v)} type="number" />
              <Field label="Resultado certo" value={cfg.ptResultado} onChange={(v) => set("ptResultado", v)} type="number" />
              <Field label="Gols do vencedor" value={cfg.ptGolsVencedor} onChange={(v) => set("ptGolsVencedor", v)} type="number" />
              <Field label="Diferença de gols" value={cfg.ptDifGols} onChange={(v) => set("ptDifGols", v)} type="number" />
              <Field label="Gols de um time" value={cfg.ptGolsTime} onChange={(v) => set("ptGolsTime", v)} type="number" />
              <Field label="Peso inicial" value={cfg.pesoInicial} onChange={(v) => set("pesoInicial", v)} type="number" />
              <Field label="Incremento por dia" value={cfg.incrementoDia} onChange={(v) => set("incrementoDia", v)} type="number" />
              <Field label="Peso da final" value={cfg.pesoFinal} onChange={(v) => set("pesoFinal", v)} type="number" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top4">
            <AccordionTrigger>Top 4 — janelas de eficácia</AccordionTrigger>
            <AccordionContent className="grid gap-3 md:grid-cols-2">
              <Field label="Antes da Copa (%)" value={cfg.top4Antes} onChange={(v) => set("top4Antes", v)} type="number" />
              <Field label="Fase de grupos (%)" value={cfg.top4Grupos} onChange={(v) => set("top4Grupos", v)} type="number" />
              <Field label="Oitavas (%)" value={cfg.top4Oitavas} onChange={(v) => set("top4Oitavas", v)} type="number" />
              <Field label="Pós-oitavas (%)" value={cfg.top4PosOitavas} onChange={(v) => set("top4PosOitavas", v)} type="number" />
              <p className="md:col-span-2 text-[11px] text-muted-foreground">Trocas encerram após o round of 32. Potencial total: 4.000 pts (100%) → 2.000 (grupos) → 1.000 (oitavas) → 0 depois.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boletim">
            <AccordionTrigger>Boletim</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <Field label="Hora de envio diário" value={cfg.boletimHora} onChange={(v) => set("boletimHora", v)} />
              <div className="flex items-center justify-between">
                <span className="text-sm">Geração automática</span>
                <Switch checked={cfg.autoBoletim} onCheckedChange={(v) => set("autoBoletim", v)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="backup">
            <AccordionTrigger>Backup e snapshot</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Em produção, um cron job diário exporta as tabelas críticas para um repositório paralelo.
                O snapshot manual fica como cinto de segurança antes de qualquer ação destrutiva.
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
}) {
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
