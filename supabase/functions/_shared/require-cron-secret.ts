// Shared helper: valida x-cron-secret header pras edges chamadas SÓ por cron jobs.
// Retorna Response (401/500) se inválido, ou null se OK pra prosseguir.

export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.error("CRON_SECRET env var not configured");
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const got = req.headers.get("x-cron-secret");
  if (!got || got !== expected) {
    console.warn("Invalid or missing cron secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized — cron secret required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}
