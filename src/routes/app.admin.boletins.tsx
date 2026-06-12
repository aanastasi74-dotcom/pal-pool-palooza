import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Newspaper, Wand2, Send, Archive, Share2, Eye, Pencil, Mail } from "lucide-react";
import {
  useBoletinsL1,
  useGerarBoletim,
  usePublicarBoletim,
  useReenviarBoletim,
  useUpdateBoletimL1,
  type BoletimL1,
} from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MarkdownView } from "@/components/markdown-view";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
    <div className="space-y-5">
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
          ) : (boletins ?? []).length === 0 ? (
            <EmptyState icon={Newspaper} title="Nenhum boletim ainda" description="Clique em 'Gerar boletim de hoje'." />
          ) : (
            (boletins ?? []).map((b) => (
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

        <div>
          {selected ? (
            <BoletimEditor boletim={selected} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Selecione um boletim à esquerda pra revisar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoletimEditor({ boletim }: { boletim: BoletimL1 }) {
  const update = useUpdateBoletimL1();
  const publicar = usePublicarBoletim();
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
    await publicar.mutateAsync({ id: boletim.id, conteudo: texto });
    toast.success("Boletim publicado.");
    setEditandoPublicado(false);
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

      <div className="mt-4 flex flex-wrap gap-2">
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
      </div>

      {isPublicado && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Publicado em{" "}
          {boletim.publicado_em
            ? new Date(boletim.publicado_em).toLocaleString("pt-BR")
            : "—"}
          .{" "}
          <Link to="/app/boletim/$data" params={{ data: boletim.data_referencia }} className="underline">
            Ver como pereba
          </Link>
        </p>
      )}
    </div>
  );
}
