// H.2.7 — Tradução de erros do Postgres pra PT-BR

export function translatePgError(err: any): string {
  const code: string = err?.code || err?.details?.code || "";
  const message: string = err?.message || "";

  // 23514 = check_violation
  if (code === "23514") {
    if (message.includes("placar")) return "Placar deve estar entre 0 e 20.";
    if (message.includes("status")) return "Status inválido pra esta operação.";
    if (message.includes("quantidade_pedida")) return "Quantidade deve estar entre 1 e 10.";
    return "Valor inválido. Verifique e tente de novo.";
  }
  // 23505 = unique_violation
  if (code === "23505") {
    if (message.includes("apelido")) return "Esse apelido já está em uso. Escolhe outro.";
    if (message.includes("email")) return "Email já cadastrado.";
    return "Este valor já existe e tem que ser único.";
  }
  // 23503 = foreign_key_violation
  if (code === "23503") return "Referência inválida. Recarrega a página e tenta de novo.";
  // 42501 = insufficient_privilege
  if (code === "42501") return "Você não tem permissão pra essa ação.";
  // 23502 = not_null_violation
  if (code === "23502") return "Campo obrigatório não preenchido.";
  // P0001 = raise_exception (custom triggers/functions)
  if (code === "P0001" && message) return message;

  return message && !message.startsWith("new row") && !message.includes("violates")
    ? message
    : "Ops, algo deu errado. Tenta de novo ou avisa um admin.";
}
