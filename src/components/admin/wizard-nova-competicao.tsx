import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, FileText, Info, Loader2, Plus, ShieldCheck, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCriarCompeticaoWizard, useFormatosWizard, useScoreRulesWizard, WizardCompeticaoError } from "@/lib/queries/wizard-competicao";
import {
  gerarSlug,
  montarPayloadWizard,
  validarEtapaWizard,
  wizardFormInicial,
  erroSlug,
  AJUDA_INCENTIVO,
  type IncentivoTipoWizard,
  type WizardCompeticaoForm,
} from "@/lib/queries/wizard-competicao-rules";

const ETAPAS = ["Identidade", "Financeiro", "Pontuação", "Papéis", "Regulamento", "Revisão"];
const ERROS_RPC: Record<string, { mensagem: string; etapa: number }> = {
  slug_invalido: { mensagem: "Use apenas letras minúsculas, números e sublinhado (_) no identificador.", etapa: 0 },
  slug_ja_existe: { mensagem: "Já existe uma competição com esse identificador.", etapa: 0 },
  formato_indisponivel: { mensagem: "Esse formato não está disponível. Escolha outro formato.", etapa: 0 },
  nome_obrigatorio: { mensagem: "Preencha o nome e o nome curto da competição.", etapa: 0 },
  preco_invalido: { mensagem: "O preço da quota deve ser maior que zero.", etapa: 1 },
  sem_permissao: { mensagem: "Sua conta não tem permissão para criar competições.", etapa: 5 },
};

const ROTULOS_SCORE: Record<string, string> = {
  exato: "Placar exato (cravada)",
  resultado: "Resultado correto",
  gols_vencedor: "Gols do vencedor",
  dif_gols: "Diferença de gols",
  gols_time: "Gols de um time",
};

const ROTULOS_FORMATO: Record<string, string> = {
  copa_mundo: "Copa do Mundo (grupos + mata-mata)",
  liga: "Liga (pontos corridos)",
  liga_matamata: "Liga + mata-mata",
  matamata: "Mata-mata puro",
};

const brl = (valor: string) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
};

const dataHora = (valor: string) => valor ? new Date(valor).toLocaleString("pt-BR") : "Não definido";
const data = (valor: string) => valor ? new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR") : "Não definida";

export function WizardNovaCompeticao() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(0);
  const [maiorEtapa, setMaiorEtapa] = useState(0);
  const [form, setForm] = useState<WizardCompeticaoForm>(wizardFormInicial);
  const [slugEditado, setSlugEditado] = useState(false);
  const [erroEtapa, setErroEtapa] = useState("");
  const { data: formatos = [], isLoading: carregandoFormatos, error: erroFormatos, refetch: recarregarFormatos } = useFormatosWizard();
  const { data: scoreRules, isLoading: carregandoScore, error: erroScore, refetch: recarregarScore } = useScoreRulesWizard();
  const criar = useCriarCompeticaoWizard();

  function atualizar<K extends keyof WizardCompeticaoForm>(chave: K, valor: WizardCompeticaoForm[K]) {
    setForm((atual) => ({ ...atual, [chave]: valor }));
    setErroEtapa("");
  }

  function atualizarNome(nome: string) {
    setForm((atual) => ({ ...atual, nome, slug: slugEditado ? atual.slug : gerarSlug(nome) }));
    setErroEtapa("");
  }

  function validar(etapaAlvo = etapa) {
    const erro = validarEtapaWizard(etapaAlvo, form, formatos, scoreRules);
    setErroEtapa(erro ?? "");
    return !erro;
  }

  function avancar() {
    if (!validar()) return;
    const proxima = Math.min(etapa + 1, ETAPAS.length - 1);
    setEtapa(proxima);
    setMaiorEtapa((atual) => Math.max(atual, proxima));
    setErroEtapa("");
  }

  function irPara(proxima: number) {
    if (proxima > maiorEtapa) return;
    setEtapa(proxima);
    setErroEtapa("");
  }

  async function criarCompeticao() {
    for (let indice = 0; indice <= 4; indice += 1) {
      if (indice === 2 || indice === 4) continue;
      const erro = validarEtapaWizard(indice, form, formatos, scoreRules);
      if (erro) {
        setEtapa(indice);
        setErroEtapa(erro);
        return;
      }
    }
    if (!scoreRules) {
      setEtapa(2);
      setErroEtapa("Carregue o preset de pontuação antes de criar a competição.");
      return;
    }
    try {
      const resultado = await criar.mutateAsync(montarPayloadWizard(form, scoreRules));
      toast.success("Competição criada em rascunho");
      await navigate({ to: "/app/admin/competicao/$slug", params: { slug: resultado.slug } });
    } catch (erro) {
      const codigo = erro instanceof WizardCompeticaoError ? erro.codigo : "desconhecido";
      const mapeado = ERROS_RPC[codigo];
      toast.error(mapeado?.mensagem ?? (erro instanceof Error ? erro.message : "Não foi possível criar a competição."));
      if (mapeado) {
        setEtapa(mapeado.etapa);
        setMaiorEtapa((atual) => Math.max(atual, mapeado.etapa));
        setErroEtapa(mapeado.mensagem);
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Nova competição</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure a identidade, o financeiro e os papéis em seis etapas.</p>
      </div>

      <nav aria-label="Etapas da nova competição" className="overflow-x-auto pb-2">
        <ol className="flex min-w-[650px] items-center">
          {ETAPAS.map((rotulo, indice) => (
            <li key={rotulo} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => irPara(indice)}
                disabled={indice > maiorEtapa}
                aria-current={etapa === indice ? "step" : undefined}
                className="group flex flex-col items-center gap-1.5 text-center disabled:cursor-not-allowed"
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${indice < etapa ? "border-primary bg-primary text-primary-foreground" : indice === etapa ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}>
                  {indice < etapa ? <Check className="h-4 w-4" /> : indice + 1}
                </span>
                <span className={`text-[11px] font-semibold ${indice === etapa ? "text-foreground" : "text-muted-foreground"}`}>{rotulo}</span>
              </button>
              {indice < ETAPAS.length - 1 && <span className={`mx-2 mb-5 h-px flex-1 ${indice < etapa ? "bg-primary" : "bg-border"}`} />}
            </li>
          ))}
        </ol>
      </nav>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6" aria-labelledby="wizard-etapa-titulo">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Etapa {etapa + 1} de 6</p>
          <h2 id="wizard-etapa-titulo" className="mt-1 font-display text-2xl font-bold">{ETAPAS[etapa]}</h2>
        </div>

        {etapa === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <WizardField id="wizard-nome" label="Nome da competição" required>
              <Input id="wizard-nome" value={form.nome} onChange={(event) => atualizarNome(event.target.value)} placeholder="Ex.: Copa do Mundo Feminina 2027" autoFocus />
            </WizardField>
            <WizardField id="wizard-nome-curto" label="Nome curto" required>
              <Input id="wizard-nome-curto" value={form.nomeCurto} onChange={(event) => atualizar("nomeCurto", event.target.value)} placeholder="Ex.: Feminina 2027" />
            </WizardField>
            <WizardField id="wizard-slug" label="Identificador (slug)" required help="Usado no endereço. Letras minúsculas, números e _; nunca hífen.">
              <Input id="wizard-slug" className="font-mono" aria-invalid={form.slug !== "" && !!erroSlug(form.slug)} aria-describedby="wizard-slug-erro" value={form.slug} onChange={(event) => { setSlugEditado(true); atualizar("slug", event.target.value); }} placeholder="feminina2027" />
              {form.slug !== "" && erroSlug(form.slug) && <p id="wizard-slug-erro" role="alert" className="text-xs font-medium text-destructive">{erroSlug(form.slug)}</p>}
            </WizardField>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3 sm:col-span-2">
              <label htmlFor="wizard-teaser" className="text-sm font-semibold">Mostrar card 'Em breve' no lobby enquanto rascunho?</label>
              <Switch id="wizard-teaser" checked={form.teaserNoLobby} onCheckedChange={(valor) => atualizar("teaserNoLobby", valor)} />
            </div>
            <WizardField id="wizard-formato" label="Formato" required>
              {carregandoFormatos ? <Skeleton className="h-9 w-full" /> : (
                <Select value={form.formato} onValueChange={(valor) => atualizar("formato", valor)}>
                  <SelectTrigger id="wizard-formato"><SelectValue placeholder="Selecione um formato" /></SelectTrigger>
                  <SelectContent>
                    {formatos.map((formato) => (
                      <SelectItem key={formato.codigo} value={formato.codigo} disabled={!formato.disponivel}>
                        {formato.nome}{!formato.disponivel ? " — em breve" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {erroFormatos && <button type="button" className="text-left text-xs font-semibold text-destructive" onClick={() => recarregarFormatos()}>Não foi possível carregar os formatos. Tentar novamente.</button>}
            </WizardField>
            <WizardField id="wizard-pesquisa-prazo" label="Prazo da pesquisa" help="Opcional">
              <Input id="wizard-pesquisa-prazo" type="datetime-local" value={form.pesquisaPrazo} onChange={(event) => atualizar("pesquisaPrazo", event.target.value)} />
            </WizardField>
            <WizardField id="wizard-inscricoes-ate" label="Inscrições até" help="Opcional">
              <Input id="wizard-inscricoes-ate" type="datetime-local" value={form.inscricoesAte} onChange={(event) => atualizar("inscricoesAte", event.target.value)} />
            </WizardField>
            <WizardField id="wizard-inicio" label="Data de início" help="Opcional">
              <Input id="wizard-inicio" type="date" value={form.inicio} onChange={(event) => atualizar("inicio", event.target.value)} />
            </WizardField>
            <WizardField id="wizard-fim" label="Data de fim" help="Opcional">
              <Input id="wizard-fim" type="date" value={form.fim} onChange={(event) => atualizar("fim", event.target.value)} />
            </WizardField>
            <WizardField id="wizard-quorum" label="Quórum de quotas" help="Opcional; número inteiro maior que zero">
              <Input id="wizard-quorum" type="number" min="1" step="1" value={form.quorumQuotas} onChange={(event) => atualizar("quorumQuotas", event.target.value)} placeholder="Sem quórum" />
            </WizardField>
          </div>
        )}

        {etapa === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <WizardField id="wizard-preco" label="Preço da quota" required>
              <div className="relative"><span className="absolute left-3 top-2 text-sm text-muted-foreground">R$</span><Input id="wizard-preco" className="pl-10" type="number" min="0.01" step="0.01" value={form.precoQuota} onChange={(event) => atualizar("precoQuota", event.target.value)} placeholder="50,00" autoFocus /></div>
            </WizardField>
            <WizardField id="wizard-limite-quotas" label="Limite de quotas por pereba" help="Opcional; deixe vazio para não limitar">
              <Input id="wizard-limite-quotas" type="number" min="1" step="1" value={form.limiteQuotas} onChange={(event) => atualizar("limiteQuotas", event.target.value)} placeholder="Sem limite" />
            </WizardField>
            <WizardField id="wizard-taxa-tipo" label="Taxa administrativa">
              <Select value={form.taxaAdminTipo} onValueChange={(valor: WizardCompeticaoForm["taxaAdminTipo"]) => atualizar("taxaAdminTipo", valor)}>
                <SelectTrigger id="wizard-taxa-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                  <SelectItem value="absoluta">Absoluta (R$)</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </WizardField>
            <WizardField id="wizard-taxa-valor" label="Valor da taxa" help={form.taxaAdminTipo === "nenhuma" ? "Não se aplica quando a taxa é nenhuma" : form.taxaAdminTipo === "percentual" ? "Percentual de 0 a 100" : "Valor em reais"}>
              <Input id="wizard-taxa-valor" type="number" min="0" step={form.taxaAdminTipo === "percentual" ? "0.01" : "0.01"} value={form.taxaAdminValor} disabled={form.taxaAdminTipo === "nenhuma"} onChange={(event) => atualizar("taxaAdminValor", event.target.value)} />
            </WizardField>
          </div>
        )}

        {etapa === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div><h3 className="font-semibold">Preset da Copa 2026</h3><p className="mt-1 text-sm text-muted-foreground">Valores editáveis em breve — esta competição nasce com o preset da Copa 2026.</p></div>
            </div>
            {carregandoScore ? <Skeleton className="h-48 w-full" /> : erroScore ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p>Não foi possível carregar a pontuação.</p><Button variant="outline" className="mt-3" onClick={() => recarregarScore()}>Tentar novamente</Button></div>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(scoreRules ?? {}).map(([chave, valor]) => (
                  <div key={chave} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <dt className="text-sm text-muted-foreground">{ROTULOS_SCORE[chave] ?? chave.replaceAll("_", " ")}</dt>
                    <dd className="font-display text-xl font-bold">{typeof valor === "object" ? JSON.stringify(valor) : String(valor)} <span className="text-xs font-normal text-muted-foreground">pts</span></dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {etapa === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div><label htmlFor="wizard-promotores" className="font-semibold">Competição terá promotores?</label><p className="mt-1 text-sm text-muted-foreground">Promotores podem convidar perebas e receber incentivos.</p></div>
              <Switch id="wizard-promotores" checked={form.permitePromotores} onCheckedChange={(valor) => atualizar("permitePromotores", valor)} />
            </div>
            {form.permitePromotores && (
              <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <WizardField id="wizard-incentivo-tipo" label="Tipo de incentivo">
                  <Select value={form.incentivoTipo} onValueChange={(valor: IncentivoTipoWizard) => atualizar("incentivoTipo", valor)}>
                    <SelectTrigger id="wizard-incentivo-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desconto_quota">Desconto em quota</SelectItem>
                      <SelectItem value="quota_extra">Quota extra</SelectItem>
                      <SelectItem value="comissao">Comissão</SelectItem>
                    </SelectContent>
                  </Select>
                </WizardField>
                <WizardField id="wizard-incentivo-valor" label="Valor por adesão" help={AJUDA_INCENTIVO[form.incentivoTipo]}>
                  <Input id="wizard-incentivo-valor" type="number" min="0" step="0.01" value={form.incentivoValor} onChange={(event) => atualizar("incentivoValor", event.target.value)} />
                </WizardField>
                <div className="space-y-2">
                  <WizardField id="wizard-incentivo-teto" label="Teto por promotor" help="Valor inteiro; zero é um teto de zero">
                    <Input id="wizard-incentivo-teto" type="number" min="0" step="1" value={form.incentivoTeto} disabled={form.semTeto} onChange={(event) => atualizar("incentivoTeto", event.target.value)} />
                  </WizardField>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.semTeto} onCheckedChange={(valor) => atualizar("semTeto", valor === true)} /> Sem teto</label>
                </div>
                <WizardField id="wizard-limite-convites" label="Limite de convites por promotor" help="Entre 1 e 1000 convites pendentes">
                  <Input id="wizard-limite-convites" type="number" min="1" max="1000" step="1" value={form.limiteConvites} onChange={(event) => atualizar("limiteConvites", event.target.value)} />
                </WizardField>
              </div>
            )}
          </div>
        )}

        {etapa === 4 && (
          <div className="flex gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-6">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <div><h3 className="font-display text-lg font-bold">Regulamento em uma próxima etapa</h3><p className="mt-2 text-sm text-muted-foreground">O regulamento será redigido e congelado pelo console da competição.</p></div>
          </div>
        )}

        {etapa === 5 && (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm"><strong>A competição nasce em RASCUNHO</strong> — ela só aparece pros perebas quando você mudar o status.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Resumo titulo="Identidade" icon={Trophy} onEdit={() => irPara(0)} itens={[
                ["Nome", form.nome], ["Nome curto", form.nomeCurto], ["Identificador", form.slug],
                ["Formato", ROTULOS_FORMATO[form.formato] ?? formatos.find((item) => item.codigo === form.formato)?.nome ?? form.formato],
                ["Prazo da pesquisa", dataHora(form.pesquisaPrazo)], ["Inscrições até", dataHora(form.inscricoesAte)],
                ["Início", data(form.inicio)], ["Fim", data(form.fim)], ["Quórum", form.quorumQuotas || "Não definido"],
              ]} />
              <Resumo titulo="Financeiro" icon={CircleDollarSign} onEdit={() => irPara(1)} itens={[
                ["Preço da quota", brl(form.precoQuota)],
                ["Taxa administrativa", form.taxaAdminTipo === "nenhuma" ? "Nenhuma" : `${form.taxaAdminValor}${form.taxaAdminTipo === "percentual" ? "%" : " (valor absoluto)"}`],
                ["Limite por pereba", form.limiteQuotas || "Sem limite"],
              ]} />
              <Resumo titulo="Pontuação" icon={Check} onEdit={() => irPara(2)} itens={Object.entries(scoreRules ?? {}).map(([chave, valor]) => [ROTULOS_SCORE[chave] ?? chave, `${typeof valor === "object" ? JSON.stringify(valor) : String(valor)} pts`])} />
              <Resumo titulo="Papéis" icon={Users} onEdit={() => irPara(3)} itens={form.permitePromotores ? [
                ["Promotores", "Sim"], ["Incentivo", form.incentivoTipo.replaceAll("_", " ")], ["Valor por adesão", form.incentivoTipo === "quota_extra" ? "Registro de R$ 0" : brl(form.incentivoValor)],
                ["Teto", form.semTeto ? "Sem teto" : brl(form.incentivoTeto)], ["Limite de convites", form.limiteConvites],
              ] : [["Promotores", "Não"]]} />
              <Resumo titulo="Regulamento" icon={FileText} onEdit={() => irPara(4)} itens={[["Definição", "Será redigido e congelado pelo console"]]} />
            </div>
          </div>
        )}

        {erroEtapa && <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{erroEtapa}</p>}

        <div className="mt-8 flex gap-3 border-t border-border pt-5">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => irPara(etapa - 1)} disabled={etapa === 0 || criar.isPending}><ArrowLeft /> Voltar</Button>
          <div className="flex-1 sm:hidden" />
          {etapa < ETAPAS.length - 1 ? (
            <Button type="button" className="flex-1 sm:flex-none" onClick={avancar} disabled={etapa === 0 && (carregandoFormatos || !!erroSlug(form.slug))}>Avançar <ArrowRight /></Button>
          ) : (
            <Button type="button" className="flex-1 sm:flex-none" onClick={criarCompeticao} disabled={criar.isPending || !scoreRules}>
              {criar.isPending ? <Loader2 className="animate-spin" /> : <Plus />} {criar.isPending ? "Criando..." : "Criar competição"}
            </Button>
          )}
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Nenhum dado é salvo antes da confirmação na revisão.</p>
    </div>
  );
}

function WizardField({ id, label, help, required, children }: { id: string; label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><label htmlFor={id} className="text-sm font-semibold">{label}{required && <span className="text-destructive"> *</span>}</label>{children}{help && <p className="text-xs text-muted-foreground">{help}</p>}</div>;
}

function Resumo({ titulo, icon: Icon, itens, onEdit }: { titulo: string; icon: React.ElementType; itens: [string, string][]; onEdit: () => void }) {
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="mr-auto font-display font-bold">{titulo}</h3><button type="button" onClick={onEdit} className="text-xs font-semibold text-primary hover:underline">Editar</button></div>
      <dl className="space-y-2">{itens.map(([termo, valor]) => <div key={termo} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-xs"><dt className="text-muted-foreground">{termo}</dt><dd className="break-words text-right font-medium">{valor}</dd></div>)}</dl>
    </article>
  );
}
