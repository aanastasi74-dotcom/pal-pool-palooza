import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileCheck2, Eye, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePremiados, CATEGORIA_META, CategoriaPremiado } from "@/lib/queries/premiados";
import { useSetting } from "@/lib/queries/settings";
import { fmtBRL } from "@/lib/queries/premiacao";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Movimento = {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  criado_em: string;
};

const COMPETICAO = "copa_2026";
const BUCKET = "comprovantes";

function useMovimentos() {
  return useQuery({
    queryKey: ["caixa_movimentos", COMPETICAO],
    queryFn: async (): Promise<Movimento[]> => {
      const { data, error } = await (supabase as any)
        .from("caixa_movimentos")
        .select("id,tipo,categoria,descricao,valor,criado_em")
        .eq("competicao", COMPETICAO)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Movimento[];
    },
    refetchInterval: 30_000,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}




function LinhaComprovante({ premiado }: { premiado: any }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoria = premiado.categoria as CategoriaPremiado;
  const meta = CATEGORIA_META[categoria];
  const jaPago = !!premiado.comprovante_path;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${COMPETICAO}/${categoria}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (up.error) throw up.error;
      const { error: updErr } = await (supabase as any)
        .from("premiados")
        .update({
          comprovante_path: path,
          pago_em: new Date().toISOString(),
          dados_bancarios_recebidos: true,
        })
        .eq("categoria", categoria);
      if (updErr) throw updErr;
      toast.success(`Comprovante do ${meta.label} salvo ✅`);
      qc.invalidateQueries({ queryKey: ["premiados"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao subir comprovante.");
    } finally {
      setUploading(false);
    }
  };

  const verComprovante = async () => {
    if (!premiado.comprovante_path) return;
    const win = window.open("about:blank", "_blank");
    setViewing(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(premiado.comprovante_path, 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("URL assinada não retornada.");
      if (win) win.location.href = data.signedUrl;
      else window.location.assign(data.signedUrl);
    } catch (e: any) {
      win?.close();
      toast.error(e?.message ?? "Falha ao abrir comprovante.");
    } finally {
      setViewing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="text-xl">{meta.emoji}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold">{meta.label} — {premiado.apelido}</p>
        <p className="text-xs text-muted-foreground">
          {fmtBRL(Number(premiado.valor_total))}
          {jaPago && premiado.pago_em && (
            <> · pago em {new Date(premiado.pago_em).toLocaleDateString("pt-BR")}</>
          )}
        </p>
      </div>
      {jaPago ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pago
          </span>
          <button
            onClick={verComprovante}
            disabled={viewing}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-secondary/70 disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" /> Ver
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-50"
          >
            Substituir
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Anexando…" : "Anexar comprovante"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}

export function EtapaFechamentoCaixa() {
  const { user } = useAuth();
  const { data: copaEncerrada } = useSetting<boolean>("copa_encerrada");
  const { data: movimentos = [], isLoading: loadingMov } = useMovimentos();
  const { data: premiados = [] } = usePremiados();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [zerando, setZerando] = useState(false);

  if (!copaEncerrada) {
    return <p className="text-sm text-muted-foreground">Complete a etapa 2 primeiro.</p>;
  }

  const saldo = movimentos.reduce((acc, m) => acc + Number(m.valor), 0);
  const fechamento = movimentos.find((m) => m.tipo === "fechamento");
  const todosPagos = premiados.length > 0 && premiados.every((p) => !!p.comprovante_path);
  const podeZerar = todosPagos && saldo === 0;

  const registrarZeragem = async () => {
    setZerando(true);
    try {
      const { error } = await (supabase as any).from("caixa_movimentos").insert({
        competicao: COMPETICAO,
        tipo: "fechamento",
        categoria: "zeragem",
        descricao: "Zeragem do caixa — Copa 2026 encerrada",
        valor: 0,
        criado_por: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Caixa da Copa 2026 zerado e fechado ✅");
      qc.invalidateQueries({ queryKey: ["caixa_movimentos", COMPETICAO] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao registrar zeragem.");
    } finally {
      setZerando(false);
    }
  };

  return (
    <div className="space-y-6">
      {fechamento && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
          <Lock className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <p className="font-display font-bold text-success">
              Caixa da Copa 2026 fechado e zerado em {fmtDate(fechamento.criado_em)}
            </p>
            <p className="text-xs text-success/80">
              Movimento de zeragem registrado. Feature idempotente — nada mais a fazer.
            </p>
          </div>
        </div>
      )}

      {/* Razão */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Razão da competição</h3>
          <div className="rounded-xl bg-secondary px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</p>
            <p className={`font-display text-2xl font-extrabold ${saldo === 0 ? "text-success" : saldo > 0 ? "text-primary" : "text-destructive"}`}>
              {fmtBRL(saldo)}
              {saldo === 0 && <span className="ml-2 text-sm text-success">✓ zerado</span>}
            </p>
          </div>
        </div>
        {loadingMov ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m) => {
                  const v = Number(m.valor);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(m.criado_em)}</td>
                      <td className="px-3 py-2">{m.descricao}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="rounded-full bg-secondary px-2 py-0.5">{m.categoria}</span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold ${
                          v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {v > 0 ? "+" : ""}
                        {fmtBRL(v)}
                      </td>
                    </tr>
                  );
                })}
                {movimentos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Sem movimentos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Comprovantes */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">Comprovantes dos premiados</h3>
        <p className="text-xs text-muted-foreground">
          Sobe imagem ou PDF do PIX. Arquivos ficam num bucket privado — só admins veem.
        </p>
        <div className="space-y-2">
          {premiados.map((p) => (
            <LinhaComprovante key={`${p.categoria}-${p.quota_id ?? p.numero_quota}`} premiado={p} />
          ))}
          {premiados.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum premiado ainda.</p>
          )}
        </div>
      </section>

      {/* Zeragem */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold">Encerramento formal</h3>
        {fechamento ? (
          <p className="text-sm text-muted-foreground">
            Caixa já fechado em {fmtDate(fechamento.criado_em)}. Nada mais a registrar.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Habilita quando todos os {premiados.length || 6} premiados tiverem comprovante anexado
              e o saldo do razão for R$ 0,00.
              {!todosPagos && ` Faltam ${premiados.filter((p) => !p.comprovante_path).length} comprovantes.`}
              {todosPagos && saldo !== 0 && ` Saldo atual: ${fmtBRL(saldo)}.`}
            </p>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!podeZerar || zerando}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {zerando ? "Registrando…" : "Registrar zeragem do caixa"}
            </button>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Fechar caixa da Copa 2026?"
        description="Registra um movimento de zeragem (idempotente) marcando o encerramento formal. Não afeta ranking nem premiados."
        confirmLabel="Sim, fechar caixa"
        onConfirm={() => {
          setConfirmOpen(false);
          registrarZeragem();
        }}
      />
    </div>
  );
}
