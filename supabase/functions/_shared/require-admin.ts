// Shared helper: valida que o caller é um admin autenticado.
// Replicado a partir de enviar-errata-link (referência canônica).
// Uso:
//   const auth = await requireAdmin(req);
//   if (!auth.ok) return auth.res;
//   // auth.userId disponível pra audit_log

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; res: Response };

export async function requireAdmin(req: Request): Promise<RequireAdminResult> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return { ok: false, res: jsonResp({ error: "missing auth" }, 401) };

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${jwt}` },
  });
  if (!userRes.ok) return { ok: false, res: jsonResp({ error: "invalid jwt" }, 401) };
  const { id } = (await userRes.json()) as { id: string };

  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=role`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  );
  if (!profRes.ok) return { ok: false, res: jsonResp({ error: "profile lookup failed" }, 500) };
  const rows = (await profRes.json()) as Array<{ role: string }>;
  const role = rows[0]?.role;
  if (role !== "admin") return { ok: false, res: jsonResp({ error: "forbidden" }, 403) };

  return { ok: true, userId: id };
}
