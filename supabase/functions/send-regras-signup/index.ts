// Edge function: send-regras-signup
// POST (authenticated) → envia e-mail de boas-vindas com link pro regulamento.
// Idempotente via coluna profiles.email_regras_enviado_em.

const RESEND_API_URL = "https://api.resend.com/emails";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") || "https://pal-pool-palooza.lovable.app";

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
    const link = `${SITE_URL}/regras`;

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Olá, ${apelido}! 🏆</h1>
        <p style="font-size: 15px; line-height: 1.5;">Boas-vindas ao <strong>Bolão dos Perebas Copa 2026</strong>! Você acaba de virar Pereba honorário oficial.</p>
        <p style="font-size: 15px; line-height: 1.5;">Antes de comprar sua primeira quota e começar a palpitar, dá uma olhada no regulamento do bolão. Ele cobre como funciona a pontuação, como os prêmios são distribuídos, o que conta no mata-mata, e outras regras que vale conhecer pra evitar surpresa.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#16a34a; color:#fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">Ler o regulamento →</a>
        </p>
        <p style="font-size: 14px; line-height: 1.5;">Quando você terminar de ler, clica em <strong>"Aceito as regras"</strong> no app — só assim o sistema libera a próxima etapa (compra de quota). Leva 2 minutos.</p>
        <p style="font-size: 14px; line-height: 1.5;">Qualquer dúvida, chama no WhatsApp da galera ou fala com um dos Admins (Anasta, Anão ou Prof).</p>
        <p style="font-size: 14px; line-height: 1.5; margin-top: 24px;">Boa Copa!<br/>— Os Admins</p>
      </div>
    `;
    const text = `Olá, ${apelido}! Boas-vindas ao Bolão dos Perebas Copa 2026.\n\nLeia o regulamento: ${link}\n\nQuando terminar, clique em "Aceito as regras" no app pra liberar a compra de quota.\n\n— Os Admins`;

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
