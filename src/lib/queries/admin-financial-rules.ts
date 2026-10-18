import { z } from "zod";

export const incentivoSchema = z.object({
  tipo: z.enum(["desconto_quota", "quota_extra", "comissao", "nenhum"]),
  valor_por_adesao: z.number().nonnegative().finite(),
  teto: z.number().int().nonnegative().finite().optional(),
  gatilho: z.literal("quota_paga"),
});

export function incentivoParaSalvar(value: z.infer<typeof incentivoSchema>) {
  const { teto, ...resto } = incentivoSchema.parse(value);
  return teto === undefined ? resto : { ...resto, teto };
}

export const COMPROVANTE_ACCEPT = "image/png,image/jpeg,image/jpg,application/pdf";
const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
};

export function validarComprovanteDevolucao(file: Pick<File, "type" | "size"> | null | undefined) {
  if (!file) throw new Error("Anexe o comprovante do PIX já feito");
  const extensao = EXTENSAO_POR_MIME[file.type];
  if (!extensao) throw new Error("O comprovante deve ser PNG, JPG ou PDF");
  if (file.size > 5 * 1024 * 1024) throw new Error("O comprovante deve ter no máximo 5 MB");
  if (file.size === 0) throw new Error("O comprovante está vazio");
  return extensao;
}

export async function executarRegistroDevolucao<T>(passos: {
  upload: () => Promise<string>;
  registrar: () => Promise<T>;
  enviarEmail: (path: string) => Promise<void>;
}) {
  const path = await passos.upload();
  const resultado = await passos.registrar();
  // After the ledger succeeds, email failures must never look like refund failures.
  try {
    await passos.enviarEmail(path);
    return { resultado, emailEnviado: true };
  } catch {
    return { resultado, emailEnviado: false };
  }
}