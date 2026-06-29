// Shared dual-auth helper: aceita x-cron-secret válido OU JWT de admin.
// Uso:
//   const auth = await requireCronOrAdmin(req);
//   if (!auth.ok) return auth.res;

import { requireAdmin } from "./require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export type DualAuthResult =
  | { ok: true; via: "cron" | "admin"; userId: string | null }
  | { ok: false; res: Response };

export async function requireCronOrAdmin(req: Request): Promise<DualAuthResult> {
  // 1) Cron secret path
  const expectedCron = Deno.env.get("CRON_SECRET");
  const gotCron = req.headers.get("x-cron-secret");
  if (gotCron) {
    if (!expectedCron) {
      return {
        ok: false,
        res: jsonResp({ error: "Server misconfigured: CRON_SECRET not set" }, 500),
      };
    }
    if (gotCron === expectedCron) {
      return { ok: true, via: "cron", userId: null };
    }
    return {
      ok: false,
      res: jsonResp({ error: "Unauthorized — invalid cron secret" }, 401),
    };
  }

  // 2) Admin JWT path
  const hasJwt = (req.headers.get("authorization") ?? "").length > 0;
  if (hasJwt) {
    const admin = await requireAdmin(req);
    if (!admin.ok) return { ok: false, res: admin.res };
    return { ok: true, via: "admin", userId: admin.userId };
  }

  return {
    ok: false,
    res: jsonResp({ error: "Unauthorized — cron secret or admin JWT required" }, 401),
  };
}
