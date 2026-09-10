import { useEffect, useMemo, useState } from "react";
import { Award, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  type PromotorAdmin,
  type PromotorIncentivo,
  useAdminPromotores,
  useNomearPromotor,
  useRemoverPromotor,
  useSalvarPromotorSettings,
} from "@/lib/queries/admin-promotores";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIPOS: { value: PromotorIncentivo["tipo"]; label: string }[] = [
  { value: "nenhum", label: "Nenhum" },
  { value: "desconto_quota", label: "Desconto em quota" },
  { value: "quota_extra", label: "Quota extra" },
  { value: "comissao", label: "Comissão" },
];

const ERROS_NOMEACAO: Record<string, string> = {
  usuario_invalido: "Usuário inválido",
  competicao_invalida: "Competição inválida",
  ja_e_promotor: "Esse usuário já é promotor",
};

export function PromotoresSection({ slug }: { slug: string }) {
  const { data, isLoading, error } = useAdminPromotores(slug);
  const nomear = useNomearPromotor(slug);
  const remover = useRemoverPromotor(slug, data?.competicao.id);
  const salvar = useSalvarPromotorSettings(slug, data?.competicao.id);
  const [usuarioId, setUsuarioId] = useState("");
  const [confirmarRemocao, setConfirmarRemocao] = useState<PromotorAdmin | null>(null);
  const [limite, setLimite] = useState(30);
  const [incentivo, setIncentivo] = useState<PromotorIncentivo>({
    tipo: "nenhum",
    valor_por_adesao: 0,
    teto: 0,
    gatilho: "quota_paga",
  });

  useEffect(() => {
    if (!data) return;
    setLimite(data.limiteConvites);
    setIncentivo(data.incentivo);
  }, [data]);

  const somenteLeitura = data?.competicao.status === "arquivada" || data?.competicao.status === "encerrada";
  const idsPromotores = useMemo(() => new Set(data?.promotores.map((item) => item.userId) ?? []), [data?.promotores]);
  const candidatos = data?.usuariosAtivos.filter((usuario) => !idsPromotores.has(usuario.id)) ?? [];

  const nomearSelecionado = async () => {
    if (!usuarioId) return toast.error("Selecione um usuário");
    try {
      const resultado = await nomear.mutateAsync(usuarioId);
      setUsuarioId("");
      toast.success(`Promotor nomeado. Código: ${resultado.codigo}`);
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "";
      toast.error(ERROS_NOMEACAO[codigo] ?? codigo || "Não foi possível nomear o promotor");
    }
  };

  const salvarConfiguracao = async () => {
    if (!Number.isInteger(limite) || limite < 1 || limite > 1000) {
      toast.error("O limite deve ser um número inteiro entre 1 e 1000");
      return;
    }
    if (incentivo.valor_por_adesao < 0 || incentivo.teto < 0) {
      toast.error("Valores do incentivo não podem ser negativos");
      return;
    }
    try {
      await salvar.mutateAsync({ limiteConvites: limite, incentivo });
      toast.success("Configuração dos promotores salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a configuração");
    }
  };

  if (isLoading) return <Skeleton className="h-72" />;
  if (error || !data) {
    return <p className="text-sm text-destructive">Não foi possível carregar os promotores.</p>;
  }

  return (
    <section className="space-y-5" aria-labelledby={`promotores-${slug}`}>
      <div>
        <h2 id={`promotores-${slug}`} className="flex items-center gap-2 font-display text-xl font-bold">
          <Users className="h-5 w-5 text-primary" /> Promotores
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Indicações e incentivo de {data.competicao.nomeCurto}.</p>
      </div>

      {somenteLeitura && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Competição encerrada — dados disponíveis somente para consulta.
        </p>
      )}

      {!somenteLeitura && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold" htmlFor={`novo-promotor-${slug}`}>Novo promotor</label>
            <Select value={usuarioId} onValueChange={setUsuarioId}>
              <SelectTrigger id={`novo-promotor-${slug}`} className="mt-1">
                <SelectValue placeholder="Selecione um usuário ativo" />
              </SelectTrigger>
              <SelectContent>
                {candidatos.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>{usuario.apelido} — {usuario.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={nomearSelecionado} disabled={!usuarioId || nomear.isPending}>
            <UserPlus /> {nomear.isPending ? "Nomeando..." : "Nomear promotor"}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {data.promotores.length === 0 ? (
          <EmptyState title="Nenhum promotor" description="Ainda não há promotores nesta competição." />
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Promotor</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-right">Convidados</th>
                <th className="px-4 py-3 text-right">Cadastrados</th>
                <th className="px-4 py-3 text-right">Aderiram</th>
                {!somenteLeitura && <th className="px-4 py-3 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {data.promotores.map((promotor, index) => (
                <tr key={promotor.userId} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{index + 1}. {promotor.apelido}</span>
                    <span className="block text-xs text-muted-foreground">{promotor.nome}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{promotor.codigo}</td>
                  <td className="px-4 py-3 text-right">{promotor.convidado}</td>
                  <td className="px-4 py-3 text-right">{promotor.cadastrado}</td>
                  <td className="px-4 py-3 text-right font-bold">{promotor.aderiu}</td>
                  {!somenteLeitura && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setConfirmarRemocao(promotor)} aria-label={`Remover ${promotor.apelido}`}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 font-display font-bold"><Award className="h-4 w-4 text-primary" /> Configuração do incentivo</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo">
            <Select
              value={incentivo.tipo}
              onValueChange={(tipo: PromotorIncentivo["tipo"]) => setIncentivo((atual) => ({ ...atual, tipo }))}
              disabled={somenteLeitura}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((tipo) => <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Valor por adesão">
            <Input type="number" min="0" step="0.01" value={incentivo.valor_por_adesao} disabled={somenteLeitura} onChange={(e) => setIncentivo((atual) => ({ ...atual, valor_por_adesao: Number(e.target.value) }))} />
          </Field>
          <Field label="Teto">
            <Input type="number" min="0" step="0.01" value={incentivo.teto} disabled={somenteLeitura} onChange={(e) => setIncentivo((atual) => ({ ...atual, teto: Number(e.target.value) }))} />
          </Field>
          <Field label="Limite de convites">
            <Input type="number" min="1" max="1000" step="1" value={limite} disabled={somenteLeitura} onChange={(e) => setLimite(Number(e.target.value))} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Gatilho: quota paga.</p>
        {!somenteLeitura && <Button className="mt-4" onClick={salvarConfiguracao} disabled={salvar.isPending}>{salvar.isPending ? "Salvando..." : "Salvar configuração"}</Button>}
      </div>

      <ConfirmDialog
        open={!!confirmarRemocao}
        onOpenChange={(open) => !open && setConfirmarRemocao(null)}
        title={`Remover ${confirmarRemocao?.apelido ?? "promotor"}?`}
        description="A pessoa perderá o papel de promotor. As indicações existentes serão preservadas no histórico."
        confirmLabel="Remover promotor"
        onConfirm={async () => {
          const alvo = confirmarRemocao;
          setConfirmarRemocao(null);
          if (!alvo) return;
          try {
            await remover.mutateAsync(alvo.userId);
            toast.success(`${alvo.apelido} removido dos promotores`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Não foi possível remover o promotor");
          }
        }}
      />
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-xs font-semibold"><span>{label}</span>{children}</label>;
}