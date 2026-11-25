import { incentivoParaSalvar } from "@/lib/queries/admin-financial-rules";

export type FormatoWizard = {
  codigo: string;
  nome: string;
  disponivel: boolean;
};

export type IncentivoTipoWizard = "desconto_quota" | "quota_extra" | "comissao";

export type WizardCompeticaoForm = {
  nome: string;
  nomeCurto: string;
  slug: string;
  formato: string;
  pesquisaPrazo: string;
  inscricoesAte: string;
  inicio: string;
  fim: string;
  quorumQuotas: string;
  precoQuota: string;
  taxaAdminTipo: "nenhuma" | "absoluta" | "percentual";
  taxaAdminValor: string;
  limiteQuotas: string;
  permitePromotores: boolean;
  incentivoTipo: IncentivoTipoWizard;
  incentivoValor: string;
  incentivoTeto: string;
  semTeto: boolean;
  limiteConvites: string;
};

export const wizardFormInicial: WizardCompeticaoForm = {
  nome: "",
  nomeCurto: "",
  slug: "",
  formato: "",
  pesquisaPrazo: "",
  inscricoesAte: "",
  inicio: "",
  fim: "",
  quorumQuotas: "",
  precoQuota: "",
  taxaAdminTipo: "nenhuma",
  taxaAdminValor: "0",
  limiteQuotas: "",
  permitePromotores: false,
  incentivoTipo: "desconto_quota",
  incentivoValor: "0",
  incentivoTeto: "0",
  semTeto: false,
  limiteConvites: "30",
};

export function gerarSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function numeroOpcionalValido(valor: string, inteiro = false) {
  if (!valor.trim()) return true;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 1 && (!inteiro || Number.isInteger(numero));
}

export function validarEtapaWizard(
  etapa: number,
  form: WizardCompeticaoForm,
  formatos: FormatoWizard[],
  scoreRules: Record<string, unknown> | undefined,
) {
  if (etapa === 0) {
    if (!form.nome.trim() || !form.nomeCurto.trim()) return "Preencha o nome e o nome curto.";
    if (!/^[a-z0-9_]+$/.test(form.slug)) return "O identificador deve usar apenas letras minúsculas, números e sublinhado (_), sem hífen.";
    const formato = formatos.find((item) => item.codigo === form.formato);
    if (!formato?.disponivel) return "Selecione um formato disponível.";
    if (form.inicio && form.fim && form.fim < form.inicio) return "A data de fim deve ser posterior ou igual à data de início.";
    if (!numeroOpcionalValido(form.quorumQuotas, true)) return "O quórum deve ser um número inteiro maior que zero.";
  }
  if (etapa === 1) {
    const preco = Number(form.precoQuota);
    if (!form.precoQuota.trim() || !Number.isFinite(preco) || preco <= 0) return "Informe um preço de quota maior que zero.";
    if (form.taxaAdminTipo !== "nenhuma") {
      const taxa = Number(form.taxaAdminValor);
      if (!form.taxaAdminValor.trim() || !Number.isFinite(taxa) || taxa < 0) return "Informe uma taxa administrativa válida.";
      if (form.taxaAdminTipo === "percentual" && taxa > 100) return "A taxa percentual não pode ser maior que 100%.";
    }
    if (!numeroOpcionalValido(form.limiteQuotas, true)) return "O limite de quotas deve ser um número inteiro maior que zero.";
  }
  if (etapa === 2 && (!scoreRules || Object.keys(scoreRules).length === 0)) {
    return "Não foi possível carregar o preset de pontuação da Copa 2026. Tente novamente.";
  }
  if (etapa === 3 && form.permitePromotores) {
    const valor = Number(form.incentivoValor);
    if (!form.incentivoValor.trim() || !Number.isFinite(valor) || valor < 0) return "Informe um valor de incentivo válido.";
    if (!form.semTeto) {
      const teto = Number(form.incentivoTeto);
      if (!form.incentivoTeto.trim() || !Number.isInteger(teto) || teto < 0) return "O teto deve ser um número inteiro maior ou igual a zero.";
    }
    const limite = Number(form.limiteConvites);
    if (!Number.isInteger(limite) || limite < 1 || limite > 1000) return "O limite de convites deve ser um inteiro entre 1 e 1000.";
  }
  return null;
}

function adicionarSePreenchido(destino: Record<string, unknown>, chave: string, valor: string, numero = false) {
  if (valor.trim()) destino[chave] = numero ? Number(valor) : valor;
}

export function montarPayloadWizard(form: WizardCompeticaoForm, scoreRules: Record<string, unknown>) {
  const competicao: Record<string, unknown> = {
    nome: form.nome.trim(),
    nome_curto: form.nomeCurto.trim(),
    slug: form.slug,
    formato: form.formato,
    preco_quota: Number(form.precoQuota),
    taxa_admin_tipo: form.taxaAdminTipo,
    taxa_admin_valor: form.taxaAdminTipo === "nenhuma" ? 0 : Number(form.taxaAdminValor),
  };
  adicionarSePreenchido(competicao, "pesquisa_prazo", form.pesquisaPrazo ? new Date(form.pesquisaPrazo).toISOString() : "");
  adicionarSePreenchido(competicao, "inscricoes_ate", form.inscricoesAte ? new Date(form.inscricoesAte).toISOString() : "");
  adicionarSePreenchido(competicao, "inicio", form.inicio);
  adicionarSePreenchido(competicao, "fim", form.fim);
  adicionarSePreenchido(competicao, "quorum_quotas", form.quorumQuotas, true);
  adicionarSePreenchido(competicao, "limite_quotas_pereba", form.limiteQuotas, true);

  const settings: Record<string, unknown> = {
    score_rules: scoreRules,
    permite_promotor: form.permitePromotores,
  };
  if (form.permitePromotores) {
    settings.promotor_incentivo = incentivoParaSalvar({
      tipo: form.incentivoTipo,
      valor_por_adesao: Number(form.incentivoValor),
      gatilho: "quota_paga",
      ...(form.semTeto ? {} : { teto: Number(form.incentivoTeto) }),
    });
    settings.promotor_limite_convites = Number(form.limiteConvites);
  }
  return { competicao, settings };
}
