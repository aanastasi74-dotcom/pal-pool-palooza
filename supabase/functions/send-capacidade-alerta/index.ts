// Edge function: send-capacidade-alerta
// POST { check: <jsonb retornado pela RPC check_capacidade()> }
// Envia 1 email para todos os admins ativos.
const RESEND_API_URL = "https://api.resend.com/emails";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

type Metrica = {
  atual?: number;
  atual_mb?: number;
  max?: number;
  max_mb?: number;
  pct: number;
  cor: "verde" | "amarelo" | "vermelho";
};

const NOMES: Record<string, string> = {
  perebas: "Perebas",
  quotas: "Quotas",
  storage: "Storage",
  emails: "Emails (mês)",
};

const CORES_HEX: Record<string, string> = {
  verde: "#16a34a",
  amarelo: "#ca8a04",
  vermelho: "#dc2626",
};

function fmtMetrica(key: string, m: Metrica): string {
  const pct = Math.round(m.pct ?? 0);
  if (key === "storage") return `${m.atual_mb ?? 0} MB / ${m.max_mb ?? 0} MB (${pct}%)`;
  return `${m.atual ?? 0} / ${m.max ?? 0} (${pct}%)`;
}

async function rest(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!r.ok) throw new Error(`REST ${r.status}: ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const check = body.check ?? body;
    const nivel: string = check?.nivel_geral ?? "verde";
    const metricas = check?.metricas ?? {};

    const admins = (await rest(`profiles?role=eq.admin&ativo=eq.true&select=email,nome`)) as Array<{
      email: string;
      nome: string;
    }>;
    const destinatarios = admins.map((a) => a.email).filter(Boolean);
    if (destinatarios.length === 0) return json({ skipped: true, reason: "sem admins" });

    const linhas = Object.entries(metricas)
      .map(([k, v]) => {
        const m = v as Metrica;
        const cor = CORES_HEX[m.cor] ?? "#334155";
        const destaque = m.cor !== "verde";
        const label = NOMES[k] ?? k;
        return `<li style="margin:6px 0;color:${cor};${destaque ? "font-weight:bold" : ""}">${label}: ${fmtMetrica(k, m)} — ${m.cor.toUpperCase()}</li>`;
      })
      .join("");

    const corNivel = CORES_HEX[nivel] ?? "#334155";
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="font-size:20px;margin:0 0 12px">⚠️ Alerta de capacidade — <span style="color:${corNivel}">${nivel.toUpperCase()}</span></h1>
        <p style="font-size:14px;line-height:1.5">Métricas atuais de capacidade do Bolão dos Perebas:</p>
        <ul style="font-size:14px;line-height:1.5;padding-left:20px">${linhas}</ul>
        <p style="font-size:12px;color:#666;margin-top:16px">Verificado em ${check?.verificado_em ?? new Date().toISOString()}</p>
      </div>`;

    const sendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: destinatarios,
        subject: `⚠️ [Bolão Perebas] Alerta de capacidade — nível ${nivel}`,
        html,
      }),
    });
    if (!sendRes.ok) {
      const txt = await sendRes.text();
      console.error("Resend error:", sendRes.status, txt);
      return json({ error: `Resend ${sendRes.status}: ${txt}` }, 500);
    }
    const sent = (await sendRes.json()) as { id: string };
    return json({ success: true, email_id: sent.id, destinatarios });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
