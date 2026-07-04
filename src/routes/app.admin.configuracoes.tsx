import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSettings, useUpdateSetting } from "@/lib/queries/settings";
import { useMaintenanceMode, setReadOnly, setMaintenance, setAutoBackup } from "@/hooks/use-maintenance";
import { Download, Lock, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações" }] }),
  component: Configuracoes,
});

const defaultPix = { chave: "", banco: "", titular: "", instrucoes: "", valor_quota: 50 };
const defaultScore = { exato: 12, resultado: 4, gols_vencedor: 2, dif_gols: 2, gols_time: 1 };
const defaultPeso = { inicial: 10, incremento_dia: 1, final: 50 };
const defaultBoletim = { hora_envio: "22:00", auto_geracao: true };
const defaultBoletimL1 = {
  modelo: "claude-sonnet-4-6",
  max_tokens: 1500,
  temperature: 0.8,
  system_prompt: "",
};
const defaultLanterninha = { engajamento_minimo: 0.8, pontos_minimos: 200 };
const defaultCopaStart = "2026-06-11T20:00:00Z";


function Configuracoes() {
  const { data: settings } = useSettings();
  const update = useUpdateSetting();
  const flags = useMaintenanceMode();

  const [pix, setPix] = useState<any>(defaultPix);
  const [score, setScore] = useState<any>(defaultScore);
  const [peso, setPeso] = useState<any>(defaultPeso);
  const [boletim, setBoletim] = useState<any>(defaultBoletim);
  const [boletimL1, setBoletimL1] = useState<any>(defaultBoletimL1);
  const [lanterninha, setLanterninha] = useState<any>(defaultLanterninha);
  const [copaStart, setCopaStart] = useState<string>(defaultCopaStart);


  useEffect(() => {
    if (!settings) return;
    setPix({ ...defaultPix, ...(settings.pix_config ?? {}) });
    setScore({ ...defaultScore, ...(settings.score_rules ?? {}) });
    setPeso({ ...defaultPeso, ...(settings.peso_progressivo ?? {}) });
    setBoletim({ ...defaultBoletim, ...(settings.boletim_config ?? {}) });
    setBoletimL1({
      modelo: settings.boletim_modelo ?? defaultBoletimL1.modelo,
      max_tokens: settings.boletim_max_tokens ?? defaultBoletimL1.max_tokens,
      temperature: settings.boletim_temperature ?? defaultBoletimL1.temperature,
      system_prompt: settings.boletim_system_prompt ?? defaultBoletimL1.system_prompt,
    });
    setLanterninha({ ...defaultLanterninha, ...(settings.lanterninha_rule ?? {}) });
    if (settings.copa_start_date) {
      const raw = typeof settings.copa_start_date === "string" ? settings.copa_start_date : String(settings.copa_start_date);
      try {
        setCopaStart(new Date(raw).toISOString().slice(0, 16));
      } catch { setCopaStart(raw.slice(0, 16)); }
    }
  }, [settings]);

  const salvar = async () => {
    await Promise.all([
      update.mutateAsync({ key: "pix_config", value: pix }),
      update.mutateAsync({ key: "score_rules", value: score }),
      update.mutateAsync({ key: "peso_progressivo", value: peso }),
      update.mutateAsync({ key: "boletim_config", value: boletim }),
      update.mutateAsync({ key: "boletim_modelo", value: boletimL1.modelo }),
      update.mutateAsync({ key: "boletim_max_tokens", value: Number(boletimL1.max_tokens) }),
      update.mutateAsync({ key: "boletim_temperature", value: Number(boletimL1.temperature) }),
      update.mutateAsync({ key: "boletim_system_prompt", value: boletimL1.system_prompt }),
      update.mutateAsync({ key: "lanterninha_rule", value: lanterninha }),
      update.mutateAsync({ key: "copa_start_date", value: new Date(copaStart).toISOString() }),
    ]);
    toast.success("Configurações salvas, pereba-admin.");
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
    toast.success("Snapshot baixado, pereba-admin.");
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

          <AccordionItem value="top4-auto">
            <AccordionTrigger>Top 4 — cálculo automático parcial (P.4)</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  Quando ativado, após cada jogo das <b>Quartas</b>, <b>Final</b> e <b>Disputa de 3º</b> encerrar, os pontos do Top 4 são recalculados automaticamente e somados em <code>quotas.pontos</code>. Regra: <b>+400 × fator</b> por palpite que bate com um semifinalista confirmado, <b>+600 × fator</b> de top-up quando a posição exata é confirmada. Fator vem do <code>peso_no_palpite</code> congelado no palpite (25/50/100 → 0.25/0.50/1.00). O botão <b>Encerrar Copa</b> (K.3.3) continua sendo o veredito final e sobrescreve tudo.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Ativar cálculo automático parcial</p>
                  <p className="text-xs text-muted-foreground">Trigger dispara após encerrar jogos de Quartas/Final/Disputa 3º.</p>
                </div>
                <Switch
                  checked={!!settings?.top4_auto_parcial_enabled}
                  onCheckedChange={async (v) => {
                    await update.mutateAsync({ key: "top4_auto_parcial_enabled", value: v });
                    toast.success(v ? "Cálculo automático parcial ativado." : "Cálculo automático parcial desativado.");
                  }}
                />
              </div>
              <RecalcTop4AutoButton />
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

          <AccordionItem value="boletim-ia">
            <AccordionTrigger>Boletim diário (IA)</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div>
                <label className="text-xs font-bold">Modelo Anthropic</label>
                <select
                  value={boletimL1.modelo}
                  onChange={(e) => setBoletimL1({ ...boletimL1, modelo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                  <option value="claude-opus-4-6">claude-opus-4-6</option>
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Max tokens" type="number" value={String(boletimL1.max_tokens)} onChange={(v) => setBoletimL1({ ...boletimL1, max_tokens: Number(v) })} />
                <Field label="Temperature (0–1)" type="number" value={String(boletimL1.temperature)} onChange={(v) => setBoletimL1({ ...boletimL1, temperature: Number(v) })} />
              </div>
              <div>
                <label className="text-xs font-bold">System prompt</label>
                <textarea
                  value={boletimL1.system_prompt}
                  onChange={(e) => setBoletimL1({ ...boletimL1, system_prompt: e.target.value })}
                  rows={10}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                A chave <code>ANTHROPIC_API_KEY</code> é configurada como secret no Supabase Dashboard → Edge Functions.
              </p>
            </AccordionContent>
          </AccordionItem>


          <AccordionItem value="copa">
            <AccordionTrigger>Copa 2026 e lanterninha</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <Field
                label="Data e hora de início da Copa (após isso, ninguém compra mais quota)"
                type="datetime-local"
                value={copaStart}
                onChange={(v) => setCopaStart(v)}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Engajamento mínimo lanterninha (0 a 1)"
                  type="number"
                  value={String(lanterninha.engajamento_minimo)}
                  onChange={(v) => setLanterninha({ ...lanterninha, engajamento_minimo: Number(v) })}
                />
                <Field
                  label="Pontos mínimos lanterninha"
                  type="number"
                  value={String(lanterninha.pontos_minimos)}
                  onChange={(v) => setLanterninha({ ...lanterninha, pontos_minimos: Number(v) })}
                />
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

          <AccordionItem value="lembretes">
            <AccordionTrigger>Lembretes — errata do último lote</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ErrataLembretesPanel />
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

type ErrataPreview = { data_referencia: string | null; total: number; pendentes: number };

function ErrataLembretesPanel() {
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState<ErrataPreview | null>(null);
  const [open, setOpen] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-errata-link", { method: "GET" });
      if (error) throw error;
      setPreview(data as ErrataPreview);
    } catch (e: any) {
      toast.error(`Não consegui carregar o último lote: ${e?.message ?? e}`);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const disparar = async () => {
    setEnviando(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-errata-link", { method: "POST" });
      if (error) throw error;
      const enviados = (data as any)?.total_enviados ?? 0;
      const pulados = (data as any)?.total_pulados ?? 0;
      const erros = (data as any)?.erros ?? 0;
      toast.success(`Errata disparada: ${enviados} enviados, ${pulados} pulados, ${erros} erros.`);
      void carregar();
    } catch (e: any) {
      toast.error(`Falhou: ${e?.message ?? e}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Reenvia o link correto do app pros perebas que receberam o último lote de lembretes — o anterior apontava pra área de desenvolvimento e não dava acesso. Idempotente: clicar duas vezes não duplica envios (UNIQUE no banco protege).
      </p>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> carregando último lote…</div>
        ) : preview && preview.data_referencia ? (
          <div className="space-y-1">
            <div><b>Último lote:</b> {preview.data_referencia}</div>
            <div><b>Destinatários no lote:</b> {preview.total}</div>
            <div><b>Pendentes de errata:</b> {preview.pendentes}</div>
          </div>
        ) : (
          <div className="text-muted-foreground">Nenhum lote de lembretes encontrado.</div>
        )}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button
            disabled={enviando || loading || !preview?.pendentes}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar errata do último lote
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da errata</AlertDialogTitle>
            <AlertDialogDescription>
              Vou mandar errata para {preview?.pendentes ?? 0} pereba{(preview?.pendentes ?? 0) === 1 ? "" : "s"} do lote de {preview?.data_referencia ?? "—"}. Já enviados não recebem de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={disparar}>Confirmar e enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecalcTop4AutoButton() {
  const [loading, setLoading] = useState(false);
  const disparar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-pontos-top4-auto", {
        method: "POST",
        body: { trigger: "admin_manual" },
      });
      if (error) throw error;
      const d = data as any;
      toast.success(
        `Recalculado: ${d?.palpites_atualizados ?? 0} palpites, ${d?.quotas_atualizadas ?? 0} quotas. Semifinalistas: ${d?.semifinalistas ?? 0}.`,
      );
    } catch (e: any) {
      toast.error(`Falhou: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={disparar}
      disabled={loading}
      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Recalcular Top 4 parcial agora
    </button>
  );
}
