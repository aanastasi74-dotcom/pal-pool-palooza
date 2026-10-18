import { describe, expect, test } from "bun:test";
import { executarRegistroDevolucao, incentivoParaSalvar, incentivoSchema, validarComprovanteDevolucao } from "./admin-financial-rules";

const incentivo = { tipo: "comissao", valor_por_adesao: 10, gatilho: "quota_paga" };

describe("promoter caps", () => {
  test("unlimited omits teto in the saved object and parses back", () => {
    const saved = incentivoParaSalvar({ ...incentivo, teto: undefined });
    expect(Object.hasOwn(saved, "teto")).toBe(false);
    expect(incentivoSchema.parse(saved).tipo).toBe("comissao");
  });
  test("zero is a real cap", () => {
    expect(incentivoParaSalvar({ ...incentivo, teto: 0 }).teto).toBe(0);
  });
  test("finite caps must be integers", () => {
    expect(() => incentivoParaSalvar({ ...incentivo, teto: 1.5 })).toThrow();
    expect(incentivoParaSalvar({ ...incentivo, teto: 15 }).teto).toBe(15);
  });
});

describe("refund receipts", () => {
  test("receipt is required", () => {
    expect(() => validarComprovanteDevolucao(null)).toThrow();
  });
  test("only PNG, JPG and PDF are accepted", () => {
    for (const type of ["image/png", "image/jpeg", "image/jpg", "application/pdf"]) {
      expect(validarComprovanteDevolucao({ type, size: 10 })).toBe(type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg");
    }
    expect(() => validarComprovanteDevolucao({ type: "image/gif", size: 10 })).toThrow();
  });
  test("5 MB is the inclusive maximum", () => {
    expect(validarComprovanteDevolucao({ type: "application/pdf", size: 5 * 1024 * 1024 })).toBe("pdf");
    expect(() => validarComprovanteDevolucao({ type: "application/pdf", size: 5 * 1024 * 1024 + 1 })).toThrow();
  });
  test("successful registration follows upload then email", async () => {
    const calls = [];
    const result = await executarRegistroDevolucao({
      upload: async () => { calls.push("upload"); return "receipt.pdf"; },
      registrar: async () => { calls.push("rpc"); return { saldoRestante: 20 }; },
      enviarEmail: async (path) => { calls.push(`email:${path}`); },
    });
    expect(calls).toEqual(["upload", "rpc", "email:receipt.pdf"]);
    expect(result).toEqual({ resultado: { saldoRestante: 20 }, emailEnviado: true });
  });
  test("email failure preserves successful refund", async () => {
    const result = await executarRegistroDevolucao({
      upload: async () => "receipt.pdf",
      registrar: async () => ({ saldoRestante: 0 }),
      enviarEmail: async () => { throw new Error("email unavailable"); },
    });
    expect(result).toEqual({ resultado: { saldoRestante: 0 }, emailEnviado: false });
  });
  test("failed upload prevents financial registration", async () => {
    let writes = 0;
    await expect(executarRegistroDevolucao({
      upload: async () => { throw new Error("upload failed"); },
      registrar: async () => { writes++; },
      enviarEmail: async () => { writes++; },
    })).rejects.toThrow("upload failed");
    expect(writes).toBe(0);
  });
  test("failed registration prevents email", async () => {
    let emails = 0;
    await expect(executarRegistroDevolucao({
      upload: async () => "receipt.pdf",
      registrar: async () => { throw new Error("RPC failed"); },
      enviarEmail: async () => { emails++; },
    })).rejects.toThrow("RPC failed");
    expect(emails).toBe(0);
  });
});