import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Trash2, GripVertical, Send, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  useAdminResultados,
  usePerguntas,
  useSavePesquisa,
  useSavePergunta,
  useUpdateOrdemPergunta,
  useDeletePergunta,
  useDeletePesquisa,
  fetchAdminRespostasFlat,
  type PesquisaResultadoPergunta,
} from "@/lib/queries/pesquisas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/admin/pesquisas_/$id")({
  head: () => ({ meta: [{ title: "Admin — Pesquisa" }] }),
  component: PesquisaDetail,
});

function PesquisaDetail() {
  const { id } = Route.useParams();
  const isNovo = id === "novo";

  if (isNovo) return <BuilderNovo />;
  return <PesquisaExistente id={id} />;
}

function BuilderNovo() {
  const navigate = useNavigate();
  const save = useSavePesquisa();
  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [abreEm, setAbreEm] = useState(() => new Date().toISOString().slice(0, 16));
  const [encerraEm, setEncerraEm] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 16);
  });
  const [permiteId, setPermiteId] = useState(true);

  const criar = async () => {
    if (!slug.trim() || !titulo.trim()) return toast.error("Slug e título são obrigatórios.");
    try {
      const p = await save.mutateAsync({
        slug: slug.trim(),
        titulo: titulo.trim(),
        descricao: descricao || null,
        abre_em: new Date(abreEm).toISOString(),
        encerra_em: new Date(encerraEm).toISOString(),
        permite_identificar: permiteId,
        ativa: false,
      });
      toast.success("Pesquisa criada como rascunho.");
      navigate({ to: "/app/admin/pesquisas/$id", params: { id: p.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar.");
    }
  };

  return (
    <div className="space-y-4">
      <BackLink />
      <h1 className="font-display text-3xl font-extrabold">Nova pesquisa</h1>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Field label="Slug (URL)">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: pos-copa-2026" className={inputCls} />
        </Field>
        <Field label="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Descrição">
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abre em">
            <input type="datetime-local" value={abreEm} onChange={(e) => setAbreEm(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Encerra em">
            <input type="datetime-local" value={encerraEm} onChange={(e) => setEncerraEm(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={permiteId} onCheckedChange={setPermiteId} />
          Permite pereba se identificar
        </label>
        <button onClick={criar} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
          Criar rascunho
        </button>
      </div>
    </div>
  );
}

function PesquisaExistente({ id }: { id: string }) {
  const { data: pesquisa, isLoading: loadingP } = useQuery({
    queryKey: ["admin-pesquisa-raw", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pesquisas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: resultados, isLoading: loadingR } = useAdminResultados(id);
  const [tab, setTab] = useState("resultados");

  if (loadingP || loadingR) return <Skeleton className="h-64" />;
  if (!pesquisa) return <div className="rounded-2xl border border-border bg-card p-6 text-sm">Pesquisa não encontrada.</div>;

  return (
    <div className="space-y-4">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{pesquisa.titulo}</h1>
          <p className="text-xs text-muted-foreground">/{pesquisa.slug}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="configurar">Configurar</TabsTrigger>
        </TabsList>
        <TabsContent value="resultados" className="mt-4">
          {resultados && <ResultadosView resultados={resultados} />}
        </TabsContent>
        <TabsContent value="configurar" className="mt-4">
          <ConfigurarView pesquisa={pesquisa} resultados={resultados} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ RESULTADOS ============

function ResultadosView({ resultados }: { resultados: NonNullable<ReturnType<typeof useAdminResultados>["data"]> }) {
  const { pesquisa, funil, perguntas } = resultados;

  const exportar = async () => {
    try {
      const rows = await fetchAdminRespostasFlat(pesquisa.id);
      const cols = [
        "codigo_respondente",
        "apelido",
        "status_participacao",
        "concluida_em",
        "ordem",
        "pergunta",
        "tipo",
        "resposta",
        "outros",
        "respondido_em",
      ];
      const esc = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csv =
        cols.join(",") +
        "\n" +
        rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
      const bom = "\uFEFF";
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pesquisa_${pesquisa.slug}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} linha(s) exportada(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no export.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Funil de participação</h2>
        <button
          onClick={exportar}
          className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-muted"
        >
          <Download className="h-3 w-3" /> Exportar CSV
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <FunnelCard label="Universo" value={funil.universo_perebas} />
        <FunnelCard label="Concluídas" value={funil.concluidas} highlight />
        <FunnelCard label="Iniciadas" value={funil.iniciadas} />
        <FunnelCard label="Opt-out" value={funil.opt_out} />
        <FunnelCard label="Identificados" value={funil.identificados} />
        <FunnelCard label="Sem interação" value={funil.sem_interacao} />
      </div>

      <div className="space-y-4">
        {perguntas.map((p) => (
          <PerguntaResultado key={p.id} pergunta={p} />
        ))}
      </div>
    </div>
  );
}

function FunnelCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-3 shadow-card ${highlight ? "bg-primary/10" : "bg-card"}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function PerguntaResultado({ pergunta }: { pergunta: PesquisaResultadoPergunta }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            Q{pergunta.ordem} · {pergunta.tipo} · {pergunta.n_respostas} resposta(s)
          </div>
          <div className="font-display text-base font-bold">{pergunta.texto}</div>
        </div>
      </div>

      {pergunta.tipo === "escala_1_10" && pergunta.agregado && (
        <EscalaChart agregado={pergunta.agregado} />
      )}
      {(pergunta.tipo === "single" || pergunta.tipo === "multi") && pergunta.agregado && (
        <OpcoesChart agregado={pergunta.agregado} total={pergunta.n_respostas} />
      )}
      {pergunta.tipo === "texto" && (
        <TextosList textos={pergunta.textos ?? []} />
      )}

      {pergunta.outros && pergunta.outros.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-border p-2">
          <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Outros ({pergunta.outros.length})</div>
          <ul className="space-y-1 text-xs">
            {pergunta.outros.map((o, i) => (
              <li key={i} className="text-foreground">• {o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EscalaChart({ agregado }: { agregado: any }) {
  const media = agregado?.media as number | undefined;
  const dist = (agregado?.distribuicao ?? {}) as Record<string, number>;
  const entries = Array.from({ length: 10 }, (_, i) => {
    const k = String(i + 1);
    return { k, n: dist[k] ?? 0 };
  });
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold text-primary">{media?.toFixed(2) ?? "—"}</span>
        <span className="text-xs text-muted-foreground">média (1–10)</span>
      </div>
      <div className="space-y-1">
        {entries.map((e) => (
          <div key={e.k} className="flex items-center gap-2">
            <span className="w-5 text-right text-xs font-bold">{e.k}</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{ width: `${(e.n / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-xs text-muted-foreground">{e.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpcoesChart({ agregado, total }: { agregado: Record<string, number>; total: number }) {
  const entries = Object.entries(agregado).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="space-y-1">
      {entries.map(([opt, n]) => {
        const pct = total > 0 ? (n / total) * 100 : 0;
        return (
          <div key={opt} className="flex items-center gap-2">
            <span className="w-40 truncate text-xs">{opt}</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs text-muted-foreground">
              {n} · {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
      {entries.length === 0 && <div className="text-xs text-muted-foreground">Sem respostas ainda.</div>}
    </div>
  );
}

function TextosList({ textos }: { textos: { texto: string; apelido: string | null; respondido_em: string }[] }) {
  if (textos.length === 0) return <div className="text-xs text-muted-foreground">Sem respostas ainda.</div>;
  return (
    <ul className="space-y-2 text-sm">
      {textos.map((t, i) => (
        <li key={i} className="rounded-lg border border-border bg-background p-2">
          <div className="whitespace-pre-wrap">{t.texto}</div>
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">
            {t.apelido ?? "Anônimo"} · {new Date(t.respondido_em).toLocaleString("pt-BR")}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============ CONFIGURAR ============

function ConfigurarView({
  pesquisa,
  resultados,
}: {
  pesquisa: any;
  resultados: ReturnType<typeof useAdminResultados>["data"];
}) {
  const save = useSavePesquisa();
  const del = useDeletePesquisa();
  const navigate = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmPub, setConfirmPub] = useState(false);

  const [slug, setSlug] = useState(pesquisa.slug);
  const [titulo, setTitulo] = useState(pesquisa.titulo);
  const [descricao, setDescricao] = useState(pesquisa.descricao ?? "");
  const [abreEm, setAbreEm] = useState(new Date(pesquisa.abre_em).toISOString().slice(0, 16));
  const [encerraEm, setEncerraEm] = useState(new Date(pesquisa.encerra_em).toISOString().slice(0, 16));
  const [permiteId, setPermiteId] = useState(pesquisa.permite_identificar);
  const [ativa, setAtiva] = useState(pesquisa.ativa);

  const nRespostasMap = useMemo(() => {
    const m = new Map<string, number>();
    (resultados?.perguntas ?? []).forEach((p) => m.set(p.id, p.n_respostas));
    return m;
  }, [resultados]);

  const salvar = async () => {
    try {
      await save.mutateAsync({
        id: pesquisa.id,
        slug,
        titulo,
        descricao: descricao || null,
        abre_em: new Date(abreEm).toISOString(),
        encerra_em: new Date(encerraEm).toISOString(),
        permite_identificar: permiteId,
        ativa,
      });
      toast.success("Pesquisa salva.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    }
  };

  const publicar = async () => {
    try {
      await save.mutateAsync({ id: pesquisa.id, slug, titulo, descricao: descricao || null, abre_em: new Date(abreEm).toISOString(), encerra_em: new Date(encerraEm).toISOString(), permite_identificar: permiteId, ativa: true });
      setAtiva(true);
      setConfirmPub(false);
      toast.success("Pesquisa publicada.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao publicar.");
    }
  };

  const excluir = async () => {
    try {
      await del.mutateAsync(pesquisa.id);
      toast.success("Pesquisa excluída.");
      navigate({ to: "/app/admin/pesquisas" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Dados gerais</h2>
        <Field label="Slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Descrição">
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abre em">
            <input type="datetime-local" value={abreEm} onChange={(e) => setAbreEm(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Encerra em">
            <input type="datetime-local" value={encerraEm} onChange={(e) => setEncerraEm(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={permiteId} onCheckedChange={setPermiteId} />
          Permite pereba se identificar
        </label>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <button onClick={salvar} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <Save className="h-3 w-3" /> Salvar
          </button>
          {!ativa && (
            <button onClick={() => setConfirmPub(true)} className="flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground">
              <Send className="h-3 w-3" /> Publicar
            </button>
          )}
          {ativa && (
            <button onClick={() => { setAtiva(false); setTimeout(salvar, 0); }} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-bold">
              Despublicar (voltar a rascunho)
            </button>
          )}
          <button onClick={() => setConfirmDel(true)} className="ml-auto flex items-center gap-1 rounded-full border border-destructive/40 px-4 py-2 text-xs font-bold text-destructive">
            <Trash2 className="h-3 w-3" /> Excluir
          </button>
        </div>
      </div>

      <PerguntasEditor pesquisaId={pesquisa.id} nRespostasMap={nRespostasMap} />

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        description={`Excluir a pesquisa "${titulo}"? Todas as respostas serão perdidas.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={excluir}
      />
      <ConfirmDialog
        open={confirmPub}
        onOpenChange={setConfirmPub}
        description={`Publicar "${titulo}"? A pesquisa ficará visível na home entre a data de abertura e encerramento.`}
        confirmLabel="Publicar"
        onConfirm={publicar}
      />
    </div>
  );
}

function PerguntasEditor({
  pesquisaId,
  nRespostasMap,
}: {
  pesquisaId: string;
  nRespostasMap: Map<string, number>;
}) {
  const { data: perguntas, isLoading } = usePerguntas(pesquisaId);
  const savePergunta = useSavePergunta();
  const updOrdem = useUpdateOrdemPergunta();
  const delPergunta = useDeletePergunta();
  const [novaAberta, setNovaAberta] = useState(false);

  const adicionar = async (draft: any) => {
    const proxOrdem = ((perguntas?.length ?? 0) + 1);
    try {
      await savePergunta.mutateAsync({ ...draft, pesquisa_id: pesquisaId, ordem: proxOrdem });
      setNovaAberta(false);
      toast.success("Pergunta adicionada.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro.");
    }
  };

  const mover = async (idx: number, dir: -1 | 1) => {
    if (!perguntas) return;
    const other = idx + dir;
    if (other < 0 || other >= perguntas.length) return;
    const a = perguntas[idx];
    const b = perguntas[other];
    try {
      await Promise.all([
        updOrdem.mutateAsync({ id: a.id, ordem: b.ordem, pesquisa_id: pesquisaId }),
        updOrdem.mutateAsync({ id: b.id, ordem: a.ordem, pesquisa_id: pesquisaId }),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao reordenar.");
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Perguntas</h2>
        <button
          onClick={() => setNovaAberta((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Nova pergunta
        </button>
      </div>

      {novaAberta && (
        <PerguntaForm
          initial={{ tipo: "escala_1_10", texto: "", descricao: "", opcoes: [], permite_outros: false, obrigatoria: true }}
          bloqueado={false}
          onSave={adicionar}
          onCancel={() => setNovaAberta(false)}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : !perguntas || perguntas.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma pergunta ainda.</div>
      ) : (
        <ul className="space-y-2">
          {perguntas.map((p, idx) => {
            const nResp = nRespostasMap.get(p.id) ?? 0;
            const bloqueado = nResp > 0;
            return (
              <li key={p.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => mover(idx, -1)} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Subir">▲</button>
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <button onClick={() => mover(idx, 1)} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Descer">▼</button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <PerguntaEditableRow pergunta={p} bloqueado={bloqueado} nResp={nResp} pesquisaId={pesquisaId} onDelete={() => delPergunta.mutate({ id: p.id, pesquisa_id: pesquisaId })} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PerguntaEditableRow({
  pergunta,
  bloqueado,
  nResp,
  pesquisaId,
  onDelete,
}: {
  pergunta: any;
  bloqueado: boolean;
  nResp: number;
  pesquisaId: string;
  onDelete: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const save = useSavePergunta();
  const [confirmDel, setConfirmDel] = useState(false);

  const salvar = async (draft: any) => {
    try {
      await save.mutateAsync({ ...draft, id: pergunta.id, pesquisa_id: pesquisaId });
      setEditando(false);
      toast.success("Pergunta atualizada.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    }
  };

  if (editando) {
    return (
      <PerguntaForm
        initial={pergunta}
        bloqueado={bloqueado}
        onSave={salvar}
        onCancel={() => setEditando(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase text-muted-foreground">
            Q{pergunta.ordem} · {pergunta.tipo}
            {bloqueado && <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">{nResp} resposta(s) — travado</span>}
          </div>
          <div className="font-medium">{pergunta.texto}</div>
          {pergunta.descricao && <div className="text-xs text-muted-foreground">{pergunta.descricao}</div>}
          {pergunta.opcoes && pergunta.opcoes.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {pergunta.opcoes.map((o: string) => (
                <span key={o} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{o}</span>
              ))}
              {pergunta.permite_outros && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px]">+ Outros</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => setEditando(true)} className="rounded border border-border px-2 py-1 text-xs">Editar</button>
          <button
            disabled={bloqueado}
            onClick={() => setConfirmDel(true)}
            className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive disabled:opacity-40"
          >
            Excluir
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        description={`Excluir a pergunta "${pergunta.texto}"?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function PerguntaForm({
  initial,
  bloqueado,
  onSave,
  onCancel,
}: {
  initial: any;
  bloqueado: boolean;
  onSave: (draft: any) => void;
  onCancel: () => void;
}) {
  const [texto, setTexto] = useState(initial.texto ?? "");
  const [descricao, setDescricao] = useState(initial.descricao ?? "");
  const [tipo, setTipo] = useState<string>(initial.tipo ?? "escala_1_10");
  const [opcoes, setOpcoes] = useState<string[]>(initial.opcoes ?? []);
  const [permiteOutros, setPermiteOutros] = useState(!!initial.permite_outros);
  const [obrigatoria, setObrigatoria] = useState(initial.obrigatoria ?? true);
  const [novaOpcao, setNovaOpcao] = useState("");

  const submit = () => {
    if (!texto.trim()) return toast.error("Texto obrigatório.");
    if ((tipo === "single" || tipo === "multi") && opcoes.length < 2) {
      return toast.error("Adicione pelo menos 2 opções.");
    }
    onSave({
      texto: texto.trim(),
      descricao: descricao || null,
      tipo,
      opcoes: tipo === "single" || tipo === "multi" ? opcoes : null,
      permite_outros: permiteOutros,
      obrigatoria,
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/40 bg-background p-3">
      {bloqueado && (
        <div className="rounded-lg bg-muted p-2 text-[11px] text-muted-foreground">
          Esta pergunta já tem respostas. Só ordem pode ser alterada — o backend rejeita mudanças estruturais.
        </div>
      )}
      <Field label="Texto">
        <input disabled={bloqueado} value={texto} onChange={(e) => setTexto(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Descrição / ajuda">
        <input disabled={bloqueado} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Tipo">
        <select disabled={bloqueado} value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
          <option value="escala_1_10">Escala 1–10</option>
          <option value="single">Escolha única</option>
          <option value="multi">Múltipla escolha</option>
          <option value="texto">Texto livre</option>
        </select>
      </Field>

      {(tipo === "single" || tipo === "multi") && (
        <div>
          <label className="text-xs font-bold">Opções</label>
          <ul className="mt-1 space-y-1">
            {opcoes.map((o, i) => (
              <li key={i} className="flex gap-1">
                <input
                  disabled={bloqueado}
                  value={o}
                  onChange={(e) => setOpcoes(opcoes.map((x, j) => (j === i ? e.target.value : x)))}
                  className={inputCls}
                />
                <button disabled={bloqueado} onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))} className="rounded bg-destructive px-2 text-xs text-destructive-foreground disabled:opacity-40">×</button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-1">
            <input disabled={bloqueado} value={novaOpcao} onChange={(e) => setNovaOpcao(e.target.value)} placeholder="Nova opção..." className={inputCls} />
            <button
              disabled={bloqueado}
              onClick={() => {
                if (novaOpcao.trim()) {
                  setOpcoes([...opcoes, novaOpcao.trim()]);
                  setNovaOpcao("");
                }
              }}
              className="rounded bg-primary px-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
            >
              +
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <Switch disabled={bloqueado} checked={permiteOutros} onCheckedChange={setPermiteOutros} />
            Permite "Outros" com campo livre
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs">
        <Switch disabled={bloqueado} checked={obrigatoria} onCheckedChange={setObrigatoria} />
        Obrigatória
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
          Salvar pergunta
        </button>
        <button onClick={onCancel} className="rounded-full border border-border px-4 py-1.5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ============ shared ============

const inputCls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold">{label}</label>
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/app/admin/pesquisas" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3 w-3" /> Voltar para lista
    </Link>
  );
}
