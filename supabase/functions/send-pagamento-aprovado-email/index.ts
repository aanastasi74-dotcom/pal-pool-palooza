// Edge function: send-pagamento-aprovado-email
// POST { payment_id: uuid }
const RESEND_API_URL = "https://api.resend.com/emails";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL_FALLBACK = "https://pal-pool-palooza.lovable.app";

async function getAppUrl(): Promise<string> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.app_url_publico&select=value`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    if (r.ok) {
      const rows = (await r.json()) as Array<{ value: unknown }>;
      const v = rows[0]?.value;
      if (typeof v === "string" && v) return v.replace(/\/+$/, "");
    }
  } catch (_) {}
  return APP_URL_FALLBACK;
}
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

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
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "payment_id required" }, 400);

    const [pay] = await rest(`payments?id=eq.${payment_id}&select=user_id,valor,quota_id`);
    if (!pay) return json({ error: "Payment not found" }, 404);

    const [profile] = await rest(`profiles?id=eq.${pay.user_id}&select=nome,email`);
    if (!profile) return json({ error: "Profile not found" }, 404);

    let quotaNumero: number | null = null;
    if (pay.quota_id) {
      const [q] = await rest(`quotas?id=eq.${pay.quota_id}&select=numero`);
      quotaNumero = q?.numero ?? null;
    }

    const origin = req.headers.get("origin") ?? SITE_URL;
    const link = `${origin}/app/quotas`;
    const firstName = profile.nome.split(" ")[0];
    const quotaLabel = quotaNumero != null ? `Quota #${quotaNumero}` : "sua quota";

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="font-size:22px;margin:0 0 12px">Aprovado, ${firstName}! 🎉</h1>
        <p style="font-size:15px;line-height:1.5">Tua <strong>${quotaLabel}</strong> de R$ ${Number(pay.valor).toFixed(2)} foi confirmada. Tá oficialmente na perebada.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Ver minhas quotas</a></p>
        <p style="font-size:12px;color:#666">Bom palpite e boa sorte!</p>
      </div>`;
    const text = `Aprovado, ${firstName}! Tua ${quotaLabel} de R$ ${Number(pay.valor).toFixed(2)} foi confirmada.\n\n${link}`;

    const sendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM, to: [profile.email], subject: `${quotaLabel} aprovada — bem-vindo à perebada!`, html, text }),
    });
    if (!sendRes.ok) return json({ error: `Resend ${sendRes.status}: ${await sendRes.text()}` }, 500);
    const sent = (await sendRes.json()) as { id: string };
    return json({ success: true, email_id: sent.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
