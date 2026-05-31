// Edge function: send-regras-signup
// POST (authenticated) → envia e-mail de boas-vindas com link pro regulamento.
// Idempotente via coluna profiles.email_regras_enviado_em.

const RESEND_API_URL = "https://api.resend.com/emails";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "missing auth" }, 401);

    // Resolve user from JWT
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${jwt}` },
    });
    if (!userRes.ok) return json({ error: "invalid jwt" }, 401);
    const { id: userId, email } = (await userRes.json()) as { id: string; email: string };
    if (!userId || !email) return json({ error: "no user" }, 401);

    // Fetch profile
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=apelido,nome,email_regras_enviado_em`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const rows = (await pRes.json()) as Array<{ apelido: string; nome: string; email_regras_enviado_em: string | null }>;
    const profile = rows[0];
    if (!profile) return json({ error: "profile not found" }, 404);
    if (profile.email_regras_enviado_em) {
      return json({ success: true, skipped: "already sent" });
    }

    const apelido = profile.apelido || profile.nome.split(" ")[0];
    const link = `${await getAppUrl()}/regras`;

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Olá, ${apelido}! 🏆</h1>
        <p style="font-size: 15px; line-height: 1.5;">Boas-vindas ao <strong>Bolão dos Perebas Copa 2026</strong>! Você acaba de virar Pereba honorário oficial — e já aceitou o regulamento. ✓</p>
        <p style="font-size: 15px; line-height: 1.5;">Esse email é um registro do seu aceite. Guarda o link abaixo pra consultar o regulamento sempre que precisar (pontuação, prêmios, regras do mata-mata, etc.).</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#16a34a; color:#fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">Ler o regulamento →</a>
        </p>
        <p style="font-size: 15px; line-height: 1.5; margin-top: 24px;"><strong>Próximos passos no app:</strong></p>
        <ol style="font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 8px 0;">
          <li>Comprar sua primeira quota (R$ 50 via PIX)</li>
          <li>Palpitar nos 104 jogos da Copa + escolher seu Top 4</li>
          <li>Acompanhar o ranking e zoar a galera no grupo</li>
        </ol>
        <p style="font-size: 14px; line-height: 1.5; margin-top: 16px;">Qualquer dúvida, chama no WhatsApp da galera ou fala com um dos Admins (Anasta, Anão ou Prof).</p>
        <p style="font-size: 14px; line-height: 1.5; margin-top: 24px;">Boa Copa!<br/>— Os Admins</p>
      </div>
    `;
    const text = `Olá, ${apelido}! 🏆\n\nBoas-vindas ao Bolão dos Perebas Copa 2026! Você acaba de virar Pereba honorário oficial — e já aceitou o regulamento. ✓\n\nEsse email é um registro do seu aceite. Guarda o link abaixo pra consultar o regulamento sempre que precisar (pontuação, prêmios, regras do mata-mata, etc.).\n\nLer o regulamento: ${link}\n\nPróximos passos no app:\n1. Comprar sua primeira quota (R$ 50 via PIX)\n2. Palpitar nos 104 jogos da Copa + escolher seu Top 4\n3. Acompanhar o ranking e zoar a galera no grupo\n\nQualquer dúvida, chama no WhatsApp da galera ou fala com um dos Admins (Anasta, Anão ou Prof).\n\nBoa Copa!\n— Os Admins`;

    const sendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Bem-vindo ao Bolão Perebas! Conheça o regulamento",
        html,
        text,
      }),
    });
    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      return json({ error: `Resend ${sendRes.status}: ${errBody}` }, 500);
    }

    // Marca como enviado (admin client)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email_regras_enviado_em: new Date().toISOString() }),
    });

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
