import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Send, Sparkles } from "lucide-react";
import {
  usePesquisaPorSlug,
  usePerguntas,
  useMinhaParticipacao,
  useUpsertParticipacao,
  useInserirRespostas,
  type Pergunta,
} from "@/lib/queries/pesquisas";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/pesquisa/$slug")({
  head: () => ({ meta: [{ title: "Pesquisa — Bolão dos Perebas" }] }),
  component: PesquisaPage,
});

type RespostaState = {
  valor: any;
  outros?: string;
};

function PesquisaPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: pesquisa, isLoading: loadingP } = usePesquisaPorSlug(slug);
  const { data: perguntas = [], isLoading: loadingQ } = usePerguntas(pesquisa?.id);
  const { data: participacao } = useMinhaParticipacao(pesquisa?.id);
  const upsert = useUpsertParticipacao();
  const inserir = useInserirRespostas();

  const [identificar, setIdentificar] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (participacao?.identificou_se != null) setIdentificar(participacao.identificou_se);
  }, [participacao?.identificou_se]);

  const encerrada = useMemo(() => {
    if (!pesquisa) return false;
    return new Date(pesquisa.encerra_em) < new Date();
  }, [pesquisa]);

  const jaConcluida = participacao?.status === "concluida";

  const setResposta = (perguntaId: string, valor: any, outros?: string) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: { valor, outros } }));
  };

  const enviar = async () => {
    if (!pesquisa || !perguntas.length) return;

    const faltando = perguntas.filter((p) => {
      if (!p.obrigatoria) return false;
      const r = respostas[p.id];
      if (!r || r.valor == null) return true;
      if (p.tipo === "multi" && Array.isArray(r.valor) && r.valor.length === 0) return true;
      if (p.tipo === "texto" && typeof r.valor === "string" && !r.valor.trim()) return true;
      return false;
    });
    if (faltando.length > 0) {
      toast.error(`Faltam ${faltando.length} resposta(s) obrigatória(s).`);
      return;
    }

    setEnviando(true);
    try {
      const part = await upsert.mutateAsync({
        pesquisa_id: pesquisa.id,
        status: "iniciada",
        identificou_se: identificar,
      });

      const rows = perguntas
        .map((p) => {
          const r = respostas[p.id];
          return {
            pergunta_id: p.id,
            resposta: r?.valor ?? null,
            resposta_texto_outros: r?.outros ?? null,
          };
        })
        .filter((r) => r.resposta !== null);

      await inserir.mutateAsync({
        pesquisa_id: pesquisa.id,
        participacao_id: part.id,
        respostas: rows,
      });

      await upsert.mutateAsync({
        pesquisa_id: pesquisa.id,
        status: "concluida",
        identificou_se: identificar,
        concluida_em: new Date().toISOString(),
      });

      toast.success("Obrigado! Sua resposta foi registrada. 🎯");
      navigate({ to: "/app" });
    } catch (e: any) {
      toast.error(`Erro ao enviar: ${e?.message ?? "desconhecido"}`);
    } finally {
      setEnviando(false);
    }
  };

  if (loadingP || loadingQ) return <Skeleton className="h-96 w-full" />;
  if (!pesquisa) {
    return (
      <EmptyState icon={Sparkles} title="Pesquisa não encontrada" description="O link pode estar errado ou a pesquisa foi removida." />
    );
  }

  if (jaConcluida) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate({ to: "/app" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Voltar
        </button>
        <EmptyState icon={Sparkles} title="Você já respondeu" description="Obrigado! Sua contribuição está registrada." />
      </div>
    );
  }

  if (encerrada) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate({ to: "/app" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Voltar
        </button>
        <EmptyState icon={Sparkles} title="Prazo encerrado" description={`A pesquisa "${pesquisa.titulo}" já encerrou. Obrigado a quem respondeu — em breve compartilhamos resultados.`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate({ to: "/app" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Voltar pra home
      </button>

      <div>
        <h1 className="font-display text-3xl font-extrabold">{pesquisa.titulo}</h1>
        {pesquisa.descricao && <p className="mt-2 text-sm text-muted-foreground">{pesquisa.descricao}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          Prazo: {new Date(pesquisa.encerra_em).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {pesquisa.permite_identificar && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={identificar}
              onChange={(e) => setIdentificar(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              Quer se identificar? <span className="text-muted-foreground">(padrão: anônimo)</span>
            </span>
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Se marcar, o admin verá quem respondeu o quê. Sem marcar, respostas ficam anônimas.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {perguntas.map((p, idx) => (
          <PerguntaCard
            key={p.id}
            pergunta={p}
            indice={idx + 1}
            valor={respostas[p.id]}
            onChange={(valor, outros) => setResposta(p.id, valor, outros)}
          />
        ))}
      </div>

      <button
        onClick={enviar}
        disabled={enviando}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        {enviando ? "Enviando…" : "Enviar respostas"}
      </button>
    </div>
  );
}

function PerguntaCard({
  pergunta,
  indice,
  valor,
  onChange,
}: {
  pergunta: Pergunta;
  indice: number;
  valor?: RespostaState;
  onChange: (valor: any, outros?: string) => void;
}) {
  const OUTROS_KEY = "__outros__";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="font-display text-sm font-bold">
        {indice}. {pergunta.texto}
        {pergunta.obrigatoria && <span className="ml-1 text-destructive">*</span>}
      </p>
      {pergunta.descricao && (
        <p className="mt-1 text-xs text-muted-foreground">{pergunta.descricao}</p>
      )}

      <div className="mt-3">
        {pergunta.tipo === "escala_1_10" && (
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`h-9 w-9 rounded-lg border font-display font-bold transition ${
                  valor?.valor === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground hover:bg-muted/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === "single" && pergunta.opcoes && (
          <div className="space-y-1.5">
            {pergunta.opcoes.map((op) => (
              <label key={op} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary p-2 text-sm hover:bg-muted/40">
                <input
                  type="radio"
                  name={pergunta.id}
                  checked={valor?.valor === op}
                  onChange={() => onChange(op)}
                  className="h-3.5 w-3.5"
                />
                <span>{op}</span>
              </label>
            ))}
            {pergunta.permite_outros && (
              <div className="space-y-1.5">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary p-2 text-sm hover:bg-muted/40">
                  <input
                    type="radio"
                    name={pergunta.id}
                    checked={valor?.valor === OUTROS_KEY}
                    onChange={() => onChange(OUTROS_KEY, valor?.outros ?? "")}
                    className="h-3.5 w-3.5"
                  />
                  <span>Outros:</span>
                </label>
                {valor?.valor === OUTROS_KEY && (
                  <Input
                    placeholder="Descreva…"
                    value={valor.outros ?? ""}
                    onChange={(e) => onChange(OUTROS_KEY, e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {pergunta.tipo === "multi" && pergunta.opcoes && (
          <div className="space-y-1.5">
            {pergunta.opcoes.map((op) => {
              const marcadas: string[] = Array.isArray(valor?.valor) ? valor!.valor : [];
              const checked = marcadas.includes(op);
              return (
                <label key={op} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary p-2 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const novas = e.target.checked ? [...marcadas, op] : marcadas.filter((x) => x !== op);
                      onChange(novas, valor?.outros);
                    }}
                    className="h-3.5 w-3.5"
                  />
                  <span>{op}</span>
                </label>
              );
            })}
            {pergunta.permite_outros && (
              <div className="space-y-1.5">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary p-2 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={(Array.isArray(valor?.valor) ? (valor!.valor as string[]) : []).includes(OUTROS_KEY)}
                    onChange={(e) => {
                      const marcadas: string[] = Array.isArray(valor?.valor) ? valor!.valor : [];
                      const novas = e.target.checked
                        ? [...marcadas, OUTROS_KEY]
                        : marcadas.filter((x) => x !== OUTROS_KEY);
                      onChange(novas, valor?.outros);
                    }}
                    className="h-3.5 w-3.5"
                  />
                  <span>Outros:</span>
                </label>
                {(Array.isArray(valor?.valor) ? (valor!.valor as string[]) : []).includes(OUTROS_KEY) && (
                  <Input
                    placeholder="Descreva…"
                    value={valor?.outros ?? ""}
                    onChange={(e) => onChange(valor?.valor, e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {pergunta.tipo === "texto" && (
          <Textarea
            rows={4}
            placeholder="Escreva aqui…"
            value={valor?.valor ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
