import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Newspaper, Wand2, Send, Archive, Share2, Eye, Pencil, Mail, Sparkles, Plus } from "lucide-react";
import {
  useBoletinsL1,
  useGerarBoletim,
  usePublicarBoletim,
  useReenviarBoletim,
  useUpdateBoletimL1,
  useCriarBoletimExtraordinario,
  type BoletimL1,
} from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MarkdownView } from "@/components/markdown-view";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";


export const Route = createFileRoute("/app/admin/boletins")({
  head: () => ({ meta: [{ title: "Admin — Boletins" }] }),
  component: BoletinsAdmin,
});

const statusLabel: Record<string, string> = {
  pendente_revisao: "Pendente revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
const statusColor: Record<string, string> = {
  pendente_revisao: "bg-accent/15 text-accent",
  publicado: "bg-success/15 text-success",
  arquivado: "bg-muted text-muted-foreground",
};

function BoletinsAdmin() {
  const { data: boletins, isLoading } = useBoletinsL1();
  const gerar = useGerarBoletim();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const isMobile = useIsMobile();

  const regulares = (boletins ?? []).filter((b) => (b.tipo ?? "regular") === "regular");
  const extras = (boletins ?? []).filter((b) => b.tipo === "extraordinario");
  const selected = (boletins ?? []).find((b) => b.id === selectedId) ?? null;

  const gerarHoje = async () => {
    const t = toast.loading("Gerando boletim via IA…");
    try {
      const r = await gerar.mutateAsync({ force_regenerate: false });
      toast.dismiss(t);
      if (r?.skipped) toast.info(r?.motivo ?? "Pulado.");
      else toast.success(`Boletim gerado (${r?.tokens?.output ?? 0} tokens out).`);
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Boletins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Boletins diários gerados por IA — admin revisa e publica.
          </p>
        </div>
        <button
          onClick={gerarHoje}
          disabled={gerar.isPending}
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          <Wand2 className="h-3 w-3" /> Gerar boletim de hoje
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : regulares.length === 0 ? (
            <EmptyState icon={Newspaper} title="Nenhum boletim ainda" description="Clique em 'Gerar boletim de hoje'." />
          ) : (
            regulares.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full rounded-2xl border p-3 text-left shadow-card transition ${
                  selectedId === b.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">
                    {new Date(`${b.data_referencia}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[b.status]}`}>
                    {statusLabel[b.status]}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {(b.publicado_md || b.rascunho_md || "").slice(0, 140)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="hidden lg:block">
          {selected ? (
            <BoletimEditor boletim={selected} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Selecione um boletim à esquerda pra revisar.
            </div>
          )}
        </div>
      </div>

      {/* Boletins Extraordinários */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="font-display text-xl font-extrabold">Boletins Extraordinários</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Erratas, comunicados especiais, homenagens. Aparecem no /app/boletim ao lado dos regulares com badge "EXTRA".
            </p>
          </div>
          <button
            onClick={() => setOpenExtraDialog(true)}
            className="flex items-center gap-1 rounded-full border-2 border-accent bg-accent/10 px-4 py-2 text-xs font-bold text-accent"
          >
            <Plus className="h-3 w-3" /> Novo boletim extraordinário
          </button>
        </div>

        {extras.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum boletim extraordinário ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {extras.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full rounded-2xl border p-3 text-left shadow-card transition ${
                    selectedId === b.id ? "border-accent bg-accent/5" : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      ✨ EXTRA
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(`${b.data_referencia}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-bold">
                    {b.titulo_customizado ?? "Boletim Extraordinário"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {(b.publicado_md || b.rascunho_md || "").slice(0, 120)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NovoBoletimExtraDialog open={openExtraDialog} onOpenChange={setOpenExtraDialog} />

      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent
            side="bottom"
            className="flex h-[95vh] flex-col gap-0 overflow-hidden p-0"
          >
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="text-base">
                Boletim — {selected ? new Date(`${selected.data_referencia}T12:00:00`).toLocaleDateString("pt-BR") : ""}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selected && <BoletimEditor boletim={selected} />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function todayBRT(): string {
  // YYYY-MM-DD em BRT (UTC-3)
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function NovoBoletimExtraDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const criar = useCriarBoletimExtraordinario();
  const [titulo, setTitulo] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [dataRef, setDataRef] = useState(todayBRT());

  useEffect(() => {
    if (open) {
      setTitulo("");
      setMarkdown("");
      setDataRef(todayBRT());
    }
  }, [open]);

  const publicar = async () => {
    if (!titulo.trim() || !markdown.trim()) return;
    const t = toast.loading("Publicando e enviando email…");
    try {
      const r = await criar.mutateAsync({
        data_referencia: dataRef,
        titulo: titulo.trim(),
        conteudo: markdown,
      });
      toast.dismiss(t);
      const envio = (r as any)?.envio;
      if (envio?.skipped) {
        toast.success("Boletim extraordinário publicado (email já enviado anteriormente).");
      } else if ((envio?.falhas ?? 0) > 0) {
        toast.warning(`Publicado. Email pra ${envio?.sucessos ?? 0} de ${envio?.destinatarios_total ?? 0} (${envio?.falhas} falhas).`);
      } else {
        toast.success(`Publicado e enviado pra ${envio?.sucessos ?? 0} perebas!`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.dismiss(t);
      const msg = e?.message ?? "desconhecido";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Já existe um boletim extraordinário pra essa data. Apenas 1 por dia.");
      } else {
        toast.error(`Erro: ${msg}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Novo Boletim Extraordinário
          </DialogTitle>
          <DialogDescription>
            Errata, comunicado, homenagem. Será publicado imediatamente e enviado por email pra todos os perebas com quota ativa.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colar">
          <TabsList>
            <TabsTrigger value="colar">Colar conteúdo</TabsTrigger>
            <TabsTrigger value="ia" disabled>Gerar por IA (em breve)</TabsTrigger>
          </TabsList>
          <TabsContent value="colar" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <Label htmlFor="extra-titulo">Título customizado</Label>
                <Input
                  id="extra-titulo"
                  placeholder="ex: Aos Profetas Injustiçados de Domingo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={140}
                />
              </div>
              <div>
                <Label htmlFor="extra-data">Data de referência</Label>
                <Input
                  id="extra-data"
                  type="date"
                  value={dataRef}
                  onChange={(e) => setDataRef(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="extra-md">Conteúdo (Markdown)</Label>
              <Textarea
                id="extra-md"
                rows={16}
                placeholder="Cole o markdown completo do boletim aqui…"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={!titulo.trim() || !markdown.trim() || criar.isPending}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                <Send className="h-3 w-3" /> Publicar e enviar por email
              </button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}



function BoletimEditor({ boletim }: { boletim: BoletimL1 }) {
  const update = useUpdateBoletimL1();
  const publicar = usePublicarBoletim();
  const reenviar = useReenviarBoletim();
  const gerar = useGerarBoletim();

  const isPublicado = boletim.status === "publicado";
  const [editandoPublicado, setEditandoPublicado] = useState(false);
  const podeEditar = !isPublicado || editandoPublicado;

  const [texto, setTexto] = useState(boletim.publicado_md || boletim.rascunho_md || "");
  useEffect(() => {
    setTexto(boletim.publicado_md || boletim.rascunho_md || "");
    setEditandoPublicado(false);
  }, [boletim.id, boletim.publicado_md, boletim.rascunho_md]);

  const regenerar = async () => {
    if (!confirm("Vai sobrescrever o rascunho atual via IA. Continuar?")) return;
    const t = toast.loading("Regenerando…");
    try {
      const r = await gerar.mutateAsync({ data_referencia: boletim.data_referencia, force_regenerate: true });
      toast.dismiss(t);
      if (r?.skipped) toast.info(r?.motivo ?? "Pulado.");
      else toast.success("Rascunho regenerado.");
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };

  const salvarRascunho = async () => {
    await update.mutateAsync({ id: boletim.id, rascunho_md: texto });
    toast.success("Rascunho salvo.");
  };

  const onPublicar = async () => {
    try {
      const envio = await publicar.mutateAsync({ id: boletim.id, conteudo: texto });
      if (envio?.skipped) {
        toast.success("Boletim atualizado (email já enviado anteriormente — nenhuma notificação nova foi disparada).");
      } else if ((envio?.falhas ?? 0) > 0) {
        toast.warning(`Boletim publicado. Email enviado pra ${envio?.sucessos ?? 0} de ${envio?.destinatarios_total ?? 0}. Veja audit_log pra detalhes.`);
      } else {
        toast.success(`Boletim publicado e enviado pra ${envio?.sucessos ?? 0} perebas!`);
      }
      setEditandoPublicado(false);
    } catch (e: any) {
      toast.error(`Erro ao publicar/enviar: ${e?.message ?? "desconhecido"}`);
    }
  };

  const onReenviar = async () => {
    const dataFmt = new Date(`${boletim.data_referencia}T12:00:00`).toLocaleDateString("pt-BR");
    if (!confirm(`Reenviar boletim de ${dataFmt} pra todos os perebas com quota ativa? Esta ação pode levar 10-30s.`)) return;
    const t = toast.loading("Reenviando boletim por email…");
    try {
      const r = await reenviar.mutateAsync({ id: boletim.id });
      toast.dismiss(t);
      if ((r?.falhas ?? 0) > 0) {
        toast.warning(`Enviado pra ${r?.sucessos ?? 0} de ${r?.destinatarios_total ?? 0} perebas (${r?.falhas} falhas — veja audit_log).`);
      } else {
        toast.success(`Enviado pra ${r?.sucessos ?? 0} de ${r?.destinatarios_total ?? 0} perebas.`);
      }
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };


  const arquivar = async () => {
    await update.mutateAsync({ id: boletim.id, status: "arquivado" });
    toast.info("Boletim arquivado.");
  };

  const compartilhar = () => {
    const cabec = `📰 Boletim do dia ${new Date(`${boletim.data_referencia}T12:00:00`).toLocaleDateString("pt-BR")}\n\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(cabec + (boletim.publicado_md ?? texto))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            {new Date(`${boletim.data_referencia}T12:00:00`).toLocaleDateString("pt-BR")}
            {boletim.modelo_usado && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px]">{boletim.modelo_usado}</span>
            )}
            {boletim.tokens_output != null && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                {boletim.tokens_input}→{boletim.tokens_output} tok
              </span>
            )}
          </p>
          <h2 className="font-display text-xl font-bold">{statusLabel[boletim.status]}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublicado && !editandoPublicado && (
            <button
              onClick={() => setEditandoPublicado(true)}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold"
            >
              <Pencil className="h-3 w-3" /> Editar publicado
            </button>
          )}
          <button
            onClick={regenerar}
            disabled={gerar.isPending}
            className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" /> Regenerar via IA
          </button>
        </div>
      </div>

      <Tabs defaultValue={podeEditar ? "editar" : "preview"}>
        <TabsList>
          <TabsTrigger value="editar" disabled={!podeEditar}>
            <Pencil className="mr-1 h-3 w-3" /> Editar
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1 h-3 w-3" /> Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="editar">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={18}
            disabled={!podeEditar}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="rounded-lg border border-border bg-background p-4">
            <MarkdownView>{texto || "_(vazio)_"}</MarkdownView>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex flex-wrap gap-2 border-t border-border bg-card/95 px-5 py-3 backdrop-blur lg:static lg:mx-0 lg:mb-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        {!isPublicado && (
          <>
            <button
              onClick={salvarRascunho}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold"
            >
              Salvar rascunho
            </button>
            <button
              onClick={onPublicar}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
            >
              <Send className="h-3 w-3" /> Publicar agora
            </button>
            <button
              onClick={arquivar}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
            >
              <Archive className="h-3 w-3" /> Arquivar
            </button>
          </>
        )}
        {isPublicado && editandoPublicado && (
          <button
            onClick={onPublicar}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Send className="h-3 w-3" /> Salvar e republicar
          </button>
        )}
        {isPublicado && (
          <button
            onClick={compartilhar}
            className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-xs font-bold text-success"
          >
            <Share2 className="h-3 w-3" /> Compartilhar no WhatsApp
          </button>
        )}
        {isPublicado && (
          <button
            onClick={onReenviar}
            disabled={reenviar.isPending}
            className="flex items-center gap-1 rounded-full border-2 border-accent/60 bg-background px-4 py-2 text-xs font-bold text-accent disabled:opacity-50"
          >
            <Mail className="h-3 w-3" /> Reenviar email aos perebas
          </button>
        )}
      </div>

      {isPublicado && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Publicado em{" "}
          {boletim.publicado_em
            ? new Date(boletim.publicado_em).toLocaleString("pt-BR")
            : "—"}
          .{" "}
          {boletim.enviado_em ? (
            <span className="text-success">Email enviado em {new Date(boletim.enviado_em).toLocaleString("pt-BR")}.</span>
          ) : (
            <span className="text-accent">Email ainda não enviado.</span>
          )}{" "}
          <Link to="/app/boletim/$data" params={{ data: boletim.data_referencia }} className="underline">
            Ver como pereba
          </Link>
        </p>
      )}
    </div>
  );
}
