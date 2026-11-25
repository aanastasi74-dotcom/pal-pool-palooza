import { describe, expect, test } from "bun:test";
import { gerarSlug, montarPayloadWizard, validarEtapaWizard, wizardFormInicial } from "./wizard-competicao-rules";

const formato = [{ codigo: "copa_mundo", nome: "Copa do Mundo", disponivel: true }];
const scoreRules = { exato: 12, resultado: 4, gols_time: 1, dif_gols: 2 };
const formValido = {
  ...wizardFormInicial,
  nome: "Copa Feminina 2027",
  nomeCurto: "Feminina 2027",
  slug: "feminina2027",
  formato: "copa_mundo",
  precoQuota: "50",
};

describe("wizard identity", () => {
  test("slug uses lowercase letters, numbers and underscores without hyphens", () => {
    expect(gerarSlug("Copa Feminina 2027")).toBe("copa_feminina_2027");
    expect(validarEtapaWizard(0, { ...formValido, slug: "feminina-2027" }, formato, scoreRules)).toContain("sem hífen");
    expect(validarEtapaWizard(0, formValido, formato, scoreRules)).toBeNull();
  });
  test("unavailable formats cannot advance", () => {
    expect(validarEtapaWizard(0, formValido, [{ ...formato[0], disponivel: false }], scoreRules)).toContain("formato disponível");
  });
});

describe("wizard financial rules", () => {
  test("quota price must be greater than zero", () => {
    expect(validarEtapaWizard(1, { ...formValido, precoQuota: "0" }, formato, scoreRules)).toContain("maior que zero");
    expect(validarEtapaWizard(1, { ...formValido, precoQuota: "50" }, formato, scoreRules)).toBeNull();
  });
  test("no admin fee saves zero", () => {
    const payload = montarPayloadWizard({ ...formValido, taxaAdminTipo: "nenhuma", taxaAdminValor: "" }, scoreRules);
    expect(payload.competicao.taxa_admin_valor).toBe(0);
  });
});

describe("wizard settings payload", () => {
  test("score rules are included exactly as loaded", () => {
    const payload = montarPayloadWizard(formValido, scoreRules);
    expect(payload.settings.score_rules).toEqual(scoreRules);
    expect(payload.settings.score_rules).toBe(scoreRules);
    expect(payload.settings.permite_promotor).toBe(false);
    expect(Object.hasOwn(payload.settings, "promotor_incentivo")).toBe(false);
  });
  test("unlimited promoter incentive omits teto", () => {
    const payload = montarPayloadWizard({
      ...formValido,
      permitePromotores: true,
      incentivoTipo: "comissao",
      incentivoValor: "10",
      semTeto: true,
      incentivoTeto: "0",
      limiteConvites: "30",
    }, scoreRules);
    const incentivo = payload.settings.promotor_incentivo;
    expect(Object.hasOwn(incentivo, "teto")).toBe(false);
    expect(incentivo.valor_por_adesao).toBe(10);
    expect(payload.settings.promotor_limite_convites).toBe(30);
  });
  test("a zero cap remains present", () => {
    const payload = montarPayloadWizard({ ...formValido, permitePromotores: true, semTeto: false, incentivoTeto: "0" }, scoreRules);
    expect(payload.settings.promotor_incentivo.teto).toBe(0);
  });
});
